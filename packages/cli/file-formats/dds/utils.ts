import fs from 'node:fs'
import path from 'node:path'
import { TexconvArgs, texconv } from '../../tools/texconv'
import { copyFile, logger, mkdir } from '../../utils'
import { replaceExtname } from '../../utils/file-utils'
import { readDdsFile } from './reader'

export async function concatDds({
  headerFile,
  imageFile,
  outFile,
}: {
  headerFile: string
  imageFile: string
  outFile?: string
}) {
  let header = await fs.promises.readFile(headerFile)
  let image = await fs.promises.readFile(imageFile)
  header[0x1c] = 0 // mip map count
  header = header.subarray(0, 0x94) // chop off the DX10 header part
  const data = Buffer.concat([header, image])

  if (outFile) {
    await fs.promises.writeFile(outFile, data)
  }
  return data
}

export async function copyDdsFile({ input, output }: { input: string; output: string }): Promise<string[]> {
  const dds = await readDdsFile(input)
  await mkdir(path.dirname(output), { recursive: true })

  if (!dds.mipFiles.length && !dds.mipFilesAlpha.length) {
    // file does not need processing
    await copyFile(input, output)
    return [output]
  }

  const result: string[] = []
  if (dds.mipFiles.length) {
    await concatDds({
      headerFile: input,
      imageFile: dds.mipFiles.pop(),
      outFile: output,
    })
    result.push(output)
  }

  if (dds.mipFilesAlpha.length) {
    // alpha channel is stored in a separate dds file ending with '.a
    //   e.g.: image.dds.a
    if (fs.existsSync(input + '.a')) {
      input = input + '.a'
    }
    // we add the '.a' to the filename before the extension
    //   e.g.: image.a.dds
    output = replaceExtname(output, '.a' + path.extname(output))
    await concatDds({
      headerFile: input,
      imageFile: dds.mipFilesAlpha.pop(),
      outFile: output,
    })
    result.push(output)
  }

  return result
}

export interface DdsToPngOptions {
  isNormal: boolean
  ddsFile: string
  outDir: string
  size?: number
  maxsize?: number
}

export async function ddsToPng({ isNormal, ddsFile, outDir, size, maxsize }: DdsToPngOptions) {
  const pngFile = replaceExtname(ddsFile, '.png')
  const options: TexconvArgs = {
    input: ddsFile,
    overwrite: true,
    fileType: 'png',
    output: outDir,
    sepalpha: true,
  }

  if (size) {
    options.width = size
    options.height = size
  }

  if (fs.existsSync(pngFile)) {
    fs.unlinkSync(pngFile)
  }

  const header = (await readDdsFile(ddsFile)).header
  if (maxsize && (header.width > maxsize || header.height > maxsize)) {
    options.width = maxsize
    options.height = maxsize
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
