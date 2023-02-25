import { texconv, TexconvArgs } from '../../tools/texconv'
import { copyFile, glob, logger, mkdir, replaceExtname } from '../../utils'
import * as fs from 'fs'
import { sortBy } from 'lodash'
import * as path from 'path'

export interface CopyTextureOptions {
  input: string
  output: string
  forceUpdate: boolean
  unlink?: boolean
}

export async function copyTexture({ input, output, forceUpdate, unlink }: CopyTextureOptions): Promise<string> {
  // TODO: do this somewhere else
  // if (!fs.existsSync(input)) {
  //   // some files are referenced as .tif but are actually .dds
  //   // probably original artwork source is a .tif file and converted to .dds in the engine pipeline
  //   input = replaceExtname(input, '.dds')
  //   output = replaceExtname(output, '.dds')
  // }

  if (!fs.existsSync(input)) {
    logger.warn(`missing ${input}`)
    return null
  }

  const pngFile = replaceExtname(output, '.png')
  if (fs.existsSync(pngFile) && !forceUpdate) {
    logger.info(`skipped ${input} -> ${pngFile}`)
    return pngFile
  }

  await copyDdsFile({
    input: input,
    output: output,
  })

  await ddsToPng({
    isNormal: path.basename(input, path.extname(output)).endsWith('_ddna'),
    ddsFile: output,
    outDir: path.dirname(pngFile),
  })
  if (unlink && fs.existsSync(output) && fs.existsSync(pngFile)) {
    fs.unlinkSync(output)
  }

  const aFile = replaceExtname(output, '.a' + path.extname(output))
  if (fs.existsSync(aFile)) {
    await ddsToPng({
      isNormal: false,
      ddsFile: aFile,
      outDir: path.dirname(pngFile),
    })
    if (unlink && fs.existsSync(aFile)) {
      fs.unlinkSync(aFile)
    }
  }

  return pngFile
}

export interface DdsToPngOptions {
  isNormal: boolean
  ddsFile: string
  outDir: string
  size?: number
}

export async function ddsToPng({ isNormal, ddsFile, outDir, size }: DdsToPngOptions) {
  const pngFile = replaceExtname(ddsFile, '.png')
  const options: TexconvArgs = {
    input: ddsFile,
    overwrite: true,
    fileType: 'png',
    output: outDir,
    width: size,
    height: size,
  }

  if (fs.existsSync(pngFile)) {
    fs.unlinkSync(pngFile)
  }

  if (isNormal) {
    return await texconv({
      ...options,
      format: 'rgba',
      reconstructZ: true, // normal map has only RG channels. Z must be reconstructed
      invertY: true, // invert Y to fix bump direction
    }).catch((err) => {
      if (!fs.existsSync(pngFile)) {
        logger.warn('texconv failed', ddsFile, err)
      }
    })
  }
  await texconv({
    ...options,
  })
    .catch((err) => {
      logger.warn('retry with rgba format', ddsFile, err)
      return texconv({
        ...options,
        format: 'rgba',
      })
    })
    .catch((err) => {
      if (!fs.existsSync(pngFile)) {
        logger.warn('texconv failed', ddsFile, err)
      }
    })
}

export async function copyDdsFile({ input, output }: { input: string; output: string }): Promise<string[]> {
  
  const mips = await glob(input + '.*', {
    caseSensitiveMatch: false,
  })
  // some dds images are split into multiple files and have the ending
  // - .dds.1
  // - .dds.2
  // ... etc.
  // Those are actually mipmaps that can be stitched to the given input file
  const mipFiles = mips.filter((it) => !!it.match(/\d$/))

  // Some files have additional mipmaps
  // - .dds.1a
  // - .dds.2a
  // They can be stitched to the same header file, but as a separate texture
  const mipAlpha = mips.filter((it) => !!it.match(/\da$/))

  await mkdir(path.dirname(output), { recursive: true })

  if (!mipFiles.length && !mipAlpha.length) {
    // file does not need processing
    await copyFile(input, output)
    return [output]
  }

  if (mipFiles.length) {
    await joinMips(input, mipFiles, output)
  }

  if (mipAlpha.length) {
    let inputA = input
    if (fs.existsSync(input + '.a')) {
      inputA = input + '.a'
    }
    let outputA = replaceExtname(output, '.a' + path.extname(output))
    await joinMips(inputA, mipAlpha, outputA)
    return [output, outputA]
  }
  return [output]
}

async function joinMips(input: string, mips: string[], target: string) {
  const files = sortBy(mips, (it) => path.extname(it).match(/\d+/)[0]).reverse()
  const first = await fs.promises.readFile(input)
  const second = await fs.promises.readFile(files[0])

  // hack into DDS header. Set only one mipmap and cutoff header
  first[0x1c] = 0 // set mip count
  const header = first.slice(0, 0x94)
  return fs.promises.writeFile(target, Buffer.concat([header, second]))
}
