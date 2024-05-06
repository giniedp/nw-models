import * as fs from 'fs'
import * as path from 'path'
import { transformGltf } from '../file-formats/gltf'
import { MtlObject, getMaterialTextures, loadMtlFile } from '../file-formats/mtl'

import { readCgf } from '../file-formats/cgf'
import { cgfToGltf } from '../file-formats/cgf/converter/gltf'
import { gameFileSystem } from '../file-formats/game-fs'
import type { ModelAsset, ModelMeshAsset, TransformContext } from '../types'
import { appendToFilename, copyFile, logger, mkdir, replaceExtname, wrapError, writeFile } from '../utils'

export async function copyMaterial({
  material,
  sourceRoot,
  targetRoot,
}: Pick<ModelMeshAsset & TransformContext, 'material' | 'sourceRoot' | 'targetRoot'>) {
  if (!material) {
    return
  }
  const input = path.join(sourceRoot, material)
  const output = path.join(targetRoot, material)

  await copyFile(input, output, {
    createDir: true,
  }).catch(wrapError(`copy material failed ${input}`))
}

function transitFileNames({
  rootDir,
  material,
  model,
  hash,
}: {
  rootDir: string
  material: string
  model: string
  hash: string
}) {
  model = path.join(rootDir, appendToFilename(model, hash ? `_${hash}` : '')).replace(/\s+/gi, '_')
  material = material ? path.join(rootDir, material) : null
  return {
    rootDir,
    material: material,
    model: model,
    gltf: replaceExtname(model, '.gltf'),
  }
}

export async function preprocessModel({
  model,
  material,
  hash,
  sourceRoot,
  targetRoot,
  update,
  ignoreSkin
}: Pick<ModelMeshAsset & TransformContext, 'model' | 'material' | 'ignoreSkin' | 'hash' | 'sourceRoot' | 'targetRoot' | 'update'>) {
  if (!model) {
    return
  }

  const modelSrc = path.join(sourceRoot, model)
  const files = transitFileNames({ rootDir: targetRoot, material, model, hash })

  for (const file of [files.model, files.gltf]) {
    if (update && file && fs.existsSync(file)) {
      fs.rmSync(file)
    }
  }

  await copyFile(modelSrc, files.model, {
    createDir: true,
  }).catch(wrapError(`copy model failed\n\t${modelSrc}`))

  if (fs.existsSync(files.gltf) && !update) {
    logger.info(`skipped`)
    return
  }

  if (!fs.existsSync(files.gltf) || update) {
    const material = await getMaterial(files.rootDir, files.material)
    const model = await readCgf(files.model, true)
    const gltf = await cgfToGltf({ model, material, animations: [], ignoreBones: ignoreSkin })
    await writeFile(files.gltf, JSON.stringify(gltf, null, 2), {
      createDir: true,
      encoding: 'utf-8',
    })
  }
}

export async function processModel({
  meshes,
  appearance,
  transitRoot,
  targetRoot,
  update,
  outDir,
  outFile,
  draco,
  webp,
  ktx,
  animations,
}: ModelAsset & TransformContext & { webp?: boolean; draco?: boolean; ktx?: boolean }) {
  if (!meshes?.length) {
    return
  }

  const finalFile = path.join(targetRoot, outDir, outFile).toLowerCase()
  if (fs.existsSync(finalFile) && update) {
    fs.rmSync(finalFile)
  }

  if (fs.existsSync(finalFile) && !update) {
    logger.info(`skipped`)
    return
  }

  await mkdir(path.dirname(finalFile), {
    recursive: true,
  })

  await Promise.all(
    meshes.map(async ({ model, material, hash, transform }) => {
      const files = transitFileNames({ rootDir: transitRoot, material, model, hash })
      return {
        model: files.model, //files.gltf,
        material: await getMaterial(files.rootDir, files.material),
        transform,
      }
    }),
  )
    .then((meshes) => {
      return transformGltf({
        animations: animations,
        meshes: meshes,
        output: finalFile,
        appearance: appearance,
        withDraco: draco,
        withWebp: webp,
        withKtx: ktx,
      })
    })
    .catch(wrapError(`transformGltf failed\n\t${finalFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function getMaterial(targetRoot: string, filePath: string): Promise<MtlObject[]> {
  if (!filePath) {
    return null
  }
  const gfs = gameFileSystem(targetRoot)
  const result = await loadMtlFile(filePath)
  return result.map((mtl) => {
    mtl.Textures
    return {
      ...mtl,
      Textures: {
        Texture: getMaterialTextures(mtl).map((tex) => {
          const file = replaceExtname(tex.File, '.png')
          const resolved = gfs.resolveTexturePath(file) || file
          return {
            ...tex,
            File: gfs.absolute(resolved),
          }
        }),
      },
    }
  })
}
