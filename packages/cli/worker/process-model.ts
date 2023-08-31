import * as path from 'path'
import * as fs from 'fs'
import { appendToFilename, copyFile, logger, mkdir, replaceExtname, transformTextFile, wrapError } from '../utils'
import type { ModelAsset, ModelMeshAsset, TransformContext } from '../types'
import { cgfConverter } from '../tools/cgf-converter'
import { colladaToGltf } from '../tools/collada-to-gltf'
import { transformGltf } from '../file-formats/gltf'
import { MaterialObject, loadMtlFile } from '../file-formats/mtl'

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

function buildModelOutPath({
  model,
  hash,
  targetRoot,
}: Pick<ModelMeshAsset & TransformContext, 'model' | 'targetRoot' | 'hash'>) {
  return path.join(targetRoot, appendToFilename(model, hash ? `_${hash}` : ''))
}

function getIntermediateFileNames({ targetRoot, material, model }: { targetRoot: string, material: string, model: string }) {
  return {
    mtl: material ? path.join(targetRoot, material) : null,
    dae: replaceExtname(model, '.dae'),
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
}: Pick<
  ModelMeshAsset & TransformContext,
  'model' | 'material' | 'hash' | 'sourceRoot' | 'targetRoot' | 'update'
>) {
  if (!model) {
    return
  }

  const modelSrc = path.join(sourceRoot, model)
  const modelTmp = buildModelOutPath({ model, hash, targetRoot })
  const files = getIntermediateFileNames({ material, model: modelTmp, targetRoot })

  if (update) {
    for (const file of [modelTmp, files.dae, files.gltf]) {
      if (fs.existsSync(file) && update) {
        fs.rmSync(file)
      }
    }
  }

  await copyFile(modelSrc, modelTmp, {
    createDir: true,
  }).catch(wrapError(`copy model failed\n\t${modelSrc}`))

  if (fs.existsSync(files.gltf) && !update) {
    logger.info(`skipped`)
    return
  }

  if (!fs.existsSync(files.dae) || update) {
    await cgfConverter({
      input: modelTmp,
      material: files.mtl,
      dataDir: targetRoot, // speeds up texture lookup, but writes wrong relative path names for textures
      outDir: path.dirname(modelTmp),
      logLevel: 0,
      png: true,
    }).catch(wrapError(`cgf-converter failed\n\t${modelTmp}`))
    // TODO: review paths. fix and remove this workaround
    await transformTextFile(files.dae, async (text) => {
      return text.replace(/<init_from>([^<]*\.(png|dds))<\/init_from>/gm, (match, texturePath) => {
        texturePath = texturePath.replace(/(..[/\\])+/, '')
        texturePath = path.join(targetRoot, texturePath)
        texturePath = path.relative(path.dirname(files.dae), replaceExtname(texturePath, '.png'))
        return `<init_from>${texturePath}<\/init_from>`
      })
    }).catch(wrapError(`transform dae model failed`))
  } else {
    logger.info(`skipped ${files.dae}`)
  }

  if (!fs.existsSync(files.gltf) || update) {
    await colladaToGltf({
      input: files.dae,
      output: files.gltf,
    }).catch(wrapError(`collada2gltf failed\n\t${files.dae}`))
  } else {
    logger.info(`skipped ${files.gltf}`)
  }
}

export async function processModel({
  meshes,
  appearance,
  targetRoot,
  update,
  outDir,
  outFile,
  draco,
  webp,
  ktx
}: ModelAsset & TransformContext & { webp?: boolean, draco?: boolean, ktx?: boolean }) {
  if (!meshes?.length) {
    return
  }

  const finalFile = path.join(targetRoot, outDir, outFile).toLowerCase()
  await mkdir(path.dirname(finalFile), {
    recursive: true,
  })

  await Promise.all(meshes.map(async ({ model, material, hash }) => {
    const modelPart = buildModelOutPath({ model, hash, targetRoot })
    const files = getIntermediateFileNames({ targetRoot, material, model: modelPart })
    return {
      model: files.gltf,
      material: await getMaterial(targetRoot, files.mtl)
    }
  })).then((meshes) => {
    return transformGltf({
      meshes: meshes,
      output: finalFile,
      appearance: appearance,
      update: update,
      withDraco: draco,
      withWebp: webp,
      withKtx: ktx
    })
  })
    .catch(wrapError(`transformGltf failed\n\t${finalFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function getMaterial(targetRoot: string, filePath: string): Promise<Array<MaterialObject>> {
  if (!filePath) {
    return null
  }
  const result = await loadMtlFile(filePath)
  return result.map((mtl) => {
    return {
      ...mtl,
      textures: mtl.textures?.map((tex) => {
        return {
          ...tex,
          File: path.join(targetRoot, replaceExtname(tex.File, '.png')),
        }
      }),
    }
  })
}
