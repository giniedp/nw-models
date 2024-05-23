import * as fs from 'fs'
import * as path from 'path'
import { readCgf } from '../file-formats/cgf'
import { createGltf } from '../file-formats/gltf'
import { MtlObject, getMtlTextures, loadMtlFile } from '../file-formats/mtl'
import { resolveAbsoluteTexturePath } from '../file-formats/resolvers'
import type { ModelAsset } from '../types'
import { copyFile, logger, mkdir, replaceExtname, wrapError } from '../utils'

export type CopyMaterialOptions = {
  inputDir: string
  outputDir: string
  material: string
}

export async function copyMaterial({ material, inputDir, outputDir }: CopyMaterialOptions) {
  if (!material) {
    return
  }
  const input = path.join(inputDir, material)
  const output = path.join(outputDir, material)
  await copyFile(input, output, {
    createDir: true,
  }).catch(wrapError(`copy material failed ${input}`))
}

export type ProcessModelOptions = ModelAsset & {
  inputDir: string
  convertDir: string
  outputDir: string
  update: boolean
  embed: boolean
  webp?: boolean
  draco?: boolean
  ktx?: boolean
}

export async function processModel({
  meshes,
  appearance,
  inputDir,
  convertDir,
  outputDir,
  update,
  outFile,
  embed,
  draco,
  webp,
  ktx,
  animations,
}: ProcessModelOptions) {
  if (!meshes?.length) {
    return
  }

  const outputFile = path.join(outputDir, outFile).toLowerCase()
  if (fs.existsSync(outputFile) && update) {
    fs.rmSync(outputFile)
  }

  if (fs.existsSync(outputFile) && !update) {
    logger.info(`skipped`)
    return
  }

  await mkdir(path.dirname(outputFile), {
    recursive: true,
  })

  await createGltf({
    animations: animations,
    meshes: meshes,
    output: outputFile,
    appearance: appearance,
    withDraco: draco,
    withWebp: webp,
    withKtx: ktx,
    embedData: embed,
    resolveCgf: async (file) => readCgf(path.join(inputDir, file), true),
    resolveMtl: async (file) => resolveMaterial(file, { inputDir: convertDir }),
  }).catch(wrapError(`transformGltf failed\n\t${outputFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function resolveMaterial(mtlFile: string, options: { inputDir: string }): Promise<MtlObject[]> {
  if (!mtlFile) {
    return null
  }
  const result = await loadMtlFile(path.join(options.inputDir, mtlFile))
  return result.map((mtl) => {
    mtl.Textures
    return {
      ...mtl,
      Textures: {
        Texture: getMtlTextures(mtl).map((tex) => {
          const file = replaceExtname(tex.File, '.png')
          return {
            ...tex,
            File: resolveAbsoluteTexturePath(file.replaceAll(' ', '_'), options),
          }
        }),
      },
    }
  })
}
