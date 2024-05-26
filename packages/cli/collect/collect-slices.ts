import { mat4 } from '@gltf-transform/core'
import fs from 'node:fs'
import path from 'node:path'
import { getAssetPath, getModelFromSliceEntity, walkSlice } from '../file-formats/dynamicslice'
import { AZ__Entity, isPrefabSpawnerComponent } from '../file-formats/dynamicslice/types'
import { ModelMeshAsset } from '../types'
import { logger, replaceExtname } from '../utils'
import { AssetCollector } from './collector'

export interface CollectSlicesOptions {
  files: string[]
  convertDir: string
  outFile: string
}

export async function collectSlices(collector: AssetCollector, options: CollectSlicesOptions) {
  const catalog = collector.catalog
  const inputDir = collector.inputDir
  const convertDir = options.convertDir
  for (const file of options.files) {
    const result: ModelMeshAsset[] = []
    const sliceFile = path.resolve(convertDir, file)
    await walkSlice(sliceFile, async (entry, transform, addSlice) => {
      const meshes = await getMeshesFromEntity(entry.entity, {
        inputDir,
        catalog,
        transform: transform,
      })
      result.push(...meshes)
      if (meshes.length > 0) {
        console.log('found meshes', meshes.length)
      }
      const prefab = entry.entity.components.find(isPrefabSpawnerComponent)
      if (!prefab || !prefab.m_sliceasset) {
        return
      }
      let assetPath = getAssetPath(collector.catalog, prefab.m_sliceasset)
      if (!assetPath) {
        return
      }
      if (assetPath.endsWith('.slice.meta')) {
        assetPath = assetPath.slice(0, -11) + '.dynamicslice'
      }
      if (!assetPath.endsWith('.dynamicslice')) {
        return
      }

      assetPath = path.resolve(convertDir, assetPath + '.json')
      if (fs.existsSync(assetPath)) {
        addSlice(assetPath)
      }
    })

    await collector.collect({
      animations: null,
      appearance: null,
      meshes: result,
      // removes .json extension
      outFile: replaceExtname(path.relative(convertDir, sliceFile), ''),
    })
  }
}

async function getMeshesFromEntity(
  entity: AZ__Entity,
  options: {
    inputDir: string
    catalog: Record<string, string>
    transform: number[]
  },
) {
  const result: ModelMeshAsset[] = []
  const asset = await getModelFromSliceEntity(entity, options.catalog)
  if (!asset) {
    return result
  }

  const extname = path.extname(asset.model).toLowerCase()
  if (extname === '.cgf' || extname === '.skin') {
    let transform = options.transform
    // if (transform && asset.transform) {
    //   transform = mat4Multiply(transform as any, asset.transform as any)
    // } else {
    //   transform = asset.transform
    // }
    result.push({
      ...asset,
      transform: transform as mat4,
    })
    return result
  }

  // if (extname === '.cdf') {
  //   const cdfMeshes = await getModelsFromCdf(path.resolve(options.inputDir, asset.model)).catch((err) => {
  //     logger.error(err)
  //     return []
  //   })
  //   let transform = options.transform
  //   if (transform && asset.transform) {
  //     transform = mat4Multiply(transform as any, asset.transform as any)
  //   } else {
  //     transform = asset.transform
  //   }

  //   for (const mesh of cdfMeshes) {
  //     result.push({
  //       model: mesh.model,
  //       material: mesh.material,
  //       transform: transform as mat4,
  //       ignoreGeometry: false,
  //       ignoreSkin: true,
  //     })
  //   }
  //   return result
  // }

  logger.warn('unknown model', asset.model)
  return result
}
