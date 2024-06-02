import fs from 'node:fs'
import path from 'node:path'
import { readCgf } from '../file-formats/cgf'
import { createGltf } from '../file-formats/gltf'
import { MtlObject, getMaterialTextures, loadMtlFile } from '../file-formats/mtl'
import { resolveAbsoluteTexturePath } from '../file-formats/resolvers'
import type { ModelAsset } from '../types'
import { copyFile, logger, mkdir, readJSONFile, replaceExtname, wrapError } from '../utils'

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
  catalogFile: string
  update: boolean
  embed: boolean
  draco?: boolean
  textureFormat?: 'jpeg' | 'png' | 'webp' | 'avif'
  textureQuality?: number
}

const cache: Record<string, any> = {}
async function loadCatalog(file: string) {
  if (cache[file]) {
    return cache[file]
  }
  cache[file] = await readJSONFile(file)
  return cache[file]
}

export async function processModel({
  meshes,
  lights,
  cameras,
  entities,
  appearance,
  inputDir,
  convertDir,
  outputDir,
  catalogFile,
  update,
  outFile,
  embed,
  draco,
  textureFormat,
  textureQuality,
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
    lights: lights,
    cameras: cameras,
    entities: entities,
    output: outputFile,
    appearance: appearance,
    withDraco: draco,
    textureFormat,
    textureQuality,
    embedData: embed,
    resolveCgf: async (file) => readCgf(path.join(inputDir, file), true),
    resolveMtl: async (file) =>
      resolveMaterial(file, {
        inputDir: convertDir,
        catalog: await loadCatalog(catalogFile),
      }),
  }).catch(wrapError(`transformGltf failed\n\t${outputFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function resolveMaterial(
  mtlFile: string,
  options: { inputDir: string; catalog: Record<string, string> },
): Promise<MtlObject[]> {
  if (!mtlFile) {
    return null
  }
  const result = await loadMtlFile(mtlFile, {
    inputDir: options.inputDir,
    catalog: options.catalog,
  })
  return result.map((mtl) => {
    mtl.Textures
    return {
      ...mtl,
      Textures: {
        Texture: getMaterialTextures(mtl).map((tex) => {
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
