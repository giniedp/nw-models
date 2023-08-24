import * as path from 'path'
import * as fs from 'fs'
import { appendToFilename, copyFile, logger, mkdir, replaceExtname, transformTextFile, wrapError } from '../utils'
import type { ModelAsset, TransformContext } from '../types'
import { cgfConverter } from '../tools/cgf-converter'
import { colladaToGltf } from '../tools/collada-to-gltf'
import { transformGltf } from '../file-formats/gltf'
import { loadMtlFile } from '../file-formats/mtl'

export async function copyMaterial({
  material,
  sourceRoot,
  targetRoot,
}: Pick<ModelAsset & TransformContext, 'material' | 'sourceRoot' | 'targetRoot'>) {
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
  modelMaterialHash,
  targetRoot,
}: Pick<ModelAsset & TransformContext, 'model' | 'targetRoot' | 'modelMaterialHash'>) {
  return path.join(targetRoot, appendToFilename(model, modelMaterialHash ? `_${modelMaterialHash}` : ''))
}

export async function preprocessModel({
  model,
  material,
  modelMaterialHash,
  sourceRoot,
  targetRoot,
  update,
}: Pick<
  ModelAsset & TransformContext,
  'model' | 'material' | 'sourceRoot' | 'targetRoot' | 'update' | 'modelMaterialHash'
>) {
  if (!model) {
    return
  }

  const input = path.join(sourceRoot, model)
  const output = buildModelOutPath({ model, modelMaterialHash, targetRoot })
  await copyFile(input, output, {
    createDir: true,
  }).catch(wrapError(`copy model failed\n\t${input}`))

  const mtlFile = material ? path.join(targetRoot, material) : null
  const daeFile = replaceExtname(output, '.dae')
  const gltfFile = replaceExtname(output, '.gltf')

  if (fs.existsSync(gltfFile) && !update) {
    logger.info(`skipped`)
    return
  }

  if (!fs.existsSync(daeFile) || update) {
    await cgfConverter({
      input: output,
      material: mtlFile,
      dataDir: targetRoot, // speeds up texture lookup, but writes wrong relative path names for textures
      outDir: path.dirname(output),
      logLevel: 0,
      png: true,
    }).catch(wrapError(`cgf-converter failed\n\t${output}`))
    // TODO: review paths. fix and remove this workaround
    await transformTextFile(daeFile, async (text) => {
      return text.replace(/<init_from>([^<]*\.(png|dds))<\/init_from>/gm, (match, texturePath) => {
        texturePath = texturePath.replace(/(..[/\\])+/, '')
        texturePath = path.join(targetRoot, texturePath)
        texturePath = path.relative(path.dirname(daeFile), replaceExtname(texturePath, '.png'))
        return `<init_from>${texturePath}<\/init_from>`
      })
    }).catch(wrapError(`transform dae model failed`))
  } else {
    logger.info(`skipped ${output}`)
  }

  if (!fs.existsSync(gltfFile) || update) {
    await colladaToGltf({
      input: daeFile,
      output: gltfFile,
    }).catch(wrapError(`collada2gltf failed\n\t${daeFile}`))
  } else {
    logger.info(`skipped ${daeFile}`)
  }
}

export async function processModel({
  model,
  material,
  modelMaterialHash,
  appearance,
  targetRoot,
  update,
  outDir,
  outFile,
}: ModelAsset & TransformContext) {
  if (!model) {
    return
  }

  const mtlFile = material ? path.join(targetRoot, material) : null
  const cgfFile = buildModelOutPath({ model, modelMaterialHash, targetRoot })
  const gltfFile = replaceExtname(cgfFile, '.gltf')
  const finalFile = replaceExtname(path.join(targetRoot, outDir, outFile).toLowerCase(), '.gltf')
  
  await mkdir(path.dirname(finalFile), {
    recursive: true,
  })

  await transformGltf({
    input: gltfFile,
    output: finalFile,
    appearance: appearance,
    material: await getMaterial(targetRoot, mtlFile),
    update: update,
  }).catch(wrapError(`transformGltf failed\n\t${gltfFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function getMaterial(targetRoot: string, filePath: string) {
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
