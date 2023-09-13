import * as path from 'path'
import { copyDdsFile, ddsToPng } from '../file-formats/dds/converter'
import { gameFileSystem } from '../file-formats/game-fs'
import { TransformContext } from '../types'
import { logger } from '../utils/logger'

export type ProcessTextureOptions = Pick<TransformContext, 'sourceRoot' | 'targetRoot' | 'update'> & {
  texture: string
  texSize?: number
}

export async function processTexture({ sourceRoot, targetRoot, texture, texSize, update }: ProcessTextureOptions) {
  const source = gameFileSystem(sourceRoot)
  const target = gameFileSystem(targetRoot)

  const file = source.resolveTexturePath(texture)
  if (!file) {
    logger.warn(`texture not found`, texture)
    return
  }

  if (target.existsSync(target.absolute(file)) && !update) {
    return
  }
  const files = await copyDdsFile({
    input: source.absolute(file),
    output: target.absolute(file),
  })

  for (const file of files) {
    const basename = path.basename(file, path.extname(file))
    await ddsToPng({
      ddsFile: file,
      outDir: path.dirname(file),
      isNormal: basename.endsWith('_ddna') || basename.endsWith('_ddn'), // !!! does not include the _ddna.a.dds files !!!
      size: texSize,
    })
  }
}
