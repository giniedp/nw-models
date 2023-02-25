import * as path from 'path'
import * as fs from 'fs'
import { copyFile, logger, replaceExtname, transformTextFile, wrapError } from '../utils'
import type { ModelAsset, TransformContext } from '../types'
import { cgfConverter } from '../tools/cgf-converter'
import { colladaToGltf } from '../tools/collada-to-gltf'
import { transformGltfGeometry, transformGltfMaterial } from '../file-formats/gltf'
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

export async function preprocessModel({
  model,
  material,
  sourceRoot,
  targetRoot,
  update,
}: Pick<ModelAsset & TransformContext, 'model' | 'material' | 'sourceRoot' | 'targetRoot' | 'update'> ) {
  if (!model) {
    return
  }

  const input = path.join(sourceRoot, model)
  const output = path.join(targetRoot, model)
  await copyFile(input, output, {
    createDir: true,
  }).catch(wrapError(`copy model failed ${input}`))

  const mtlFile = material ? path.join(targetRoot, material) : null
  const cgfFile = path.join(targetRoot, model)
  const daeFile = replaceExtname(cgfFile, '.dae')
  const gltfFile = replaceExtname(cgfFile, '.gltf')

  if (fs.existsSync(gltfFile) && !update) {
    logger.info(`skipped`)
    return
  }

  if (!fs.existsSync(daeFile) || update) {
    await cgfConverter({
      input: cgfFile,
      material: mtlFile,
      dataDir: targetRoot, // fixes texture lookup, but writes absolute path names for textures
      // logLevel: 0,
      png: true,
    }).catch(wrapError(`cgf-converter failed ${cgfFile}`))
    // Absolute paths look like this
    //   <init_from>/C:/path/to/texture</init_from>
    // the leading '/' is actually specified as a valid URI
    // collada2gltf converter does not recognize the absolute URI so we have to make them relative again
    // TODO: make this an option in cgfconverter.exe
    await transformTextFile(daeFile, async (text) => {
      return text.replace(/<init_from>\/([^<]*\.png)<\/init_from>/gm, (match, texturePath) => {
        const relativePath = path.relative(path.dirname(cgfFile), texturePath)
        return `<init_from>${relativePath}<\/init_from>`
      })
    }).catch(wrapError(`transform dae model failed`))
  } else {
    logger.info(`skipped ${cgfFile}`)
  }

  if (!fs.existsSync(gltfFile) || update) {
    await colladaToGltf({
      input: daeFile,
      output: gltfFile,
    }).catch(wrapError(`collada2gltf failed ${daeFile}`))

    await transformGltfGeometry({
      input: gltfFile,
      output: gltfFile,
    }).catch(wrapError(`transformGltfGeometry failed ${gltfFile}`))
  } else {
    logger.info(`skipped ${daeFile}`)
  }
}

export async function processModel({
  model,
  material,
  refId,
  appearance,
  targetRoot,
  update,
}: ModelAsset & TransformContext) {
  if (!model) {
    return
  }

  const mtlFile = material ? path.join(targetRoot, material) : null
  const cgfFile = path.join(targetRoot, model)
  const gltfFile = replaceExtname(cgfFile, '.gltf')
  const finalFile = path.join(targetRoot, `${refId}.gltf`).toLowerCase()

  await transformGltfMaterial({
    input: gltfFile,
    output: finalFile,
    appearance: appearance,
    material: await getMaterial(targetRoot, mtlFile),
    update: update,
  }).catch(wrapError(`transformGltfMaterial failed ${gltfFile}`))
}

// loads the material file and transforms the texture paths
// - textureas are already in the targetRoot
// - textureas are already in .png format
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
          File: path.join(targetRoot, replaceExtname(tex.File, '.png')) 
        }
      })
    }
  })
}