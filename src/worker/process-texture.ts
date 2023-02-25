import * as path from 'path'
import * as fs from 'fs'
import { TransformContext } from '../types'
import { copyDdsFile, ddsToPng } from "../file-formats/dds/converter"

export type ProcessTextureOptions = Pick<TransformContext, 'sourceRoot' | 'targetRoot' | 'update'> & {
  texture: string
}

export async function processTexture({ sourceRoot, targetRoot, texture, update }: ProcessTextureOptions) {
  if (fs.existsSync(path.join(targetRoot, texture)) && !update) {
    return
  }
  const files = await copyDdsFile({
    input: path.join(sourceRoot, texture),
    output: path.join(targetRoot, texture),
  })

  for (const file of files) {
    await ddsToPng({
      ddsFile: file,
      outDir: path.dirname(file),
      isNormal: path.basename(file, path.extname(file)).endsWith('_ddna') // !!! does not include the _ddna.a.dds files !!!
    })
  }
}
