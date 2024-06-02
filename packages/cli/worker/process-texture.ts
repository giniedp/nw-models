import fs from 'node:fs'
import path from 'node:path'
import { copyDdsFile, ddsToPng } from '../file-formats/dds'
import { resolveAbsoluteTexturePath } from '../file-formats/resolvers'
import { logger } from '../utils/logger'

export type ProcessTextureOptions = {
  inputDir: string
  outputDir: string
  texture: string
  update?: boolean
  texSize?: number
}

export async function processTexture({ inputDir, outputDir, texture, texSize, update }: ProcessTextureOptions) {
  const inputFile = resolveAbsoluteTexturePath(texture, { inputDir })
  if (!inputFile) {
    logger.warn(`texture not found`, texture)
    return
  }
  const outputFile = path.join(outputDir, path.relative(inputDir, inputFile)).replaceAll(' ', '_')
  if (fs.existsSync(outputFile) && !update) {
    return
  }
  const files = await copyDdsFile({
    input: inputFile,
    output: outputFile,
  })

  for (const file of files) {
    const basename = path.basename(file, path.extname(file))
    await ddsToPng({
      ddsFile: file,
      outDir: path.dirname(file),
      isNormal: basename.endsWith('_ddna') || basename.endsWith('_ddn'), // !!! does not include the _ddna.a.dds files !!!
      maxsize: texSize,
    })
  }
}
