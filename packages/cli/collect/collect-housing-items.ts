import fs from 'fs'
import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { getHousingItemMeshes } from '../file-formats/dynamicslice'
import { Housingitems, ModelMeshAsset } from '../types'
import { glob, readJsonFile } from '../utils/file-utils'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectHousingItems(slicesDir: string, items: Housingitems[], collector: AssetCollector) {
  const outDir = 'housingitems'
  for (const item of items) {
    const sliceFile = path.join(slicesDir, item.PrefabPath) + '.dynamicslice.json'
    if (!fs.existsSync(sliceFile)) {
      logger.warn('missing slice', sliceFile)
      continue
    }
    const meshes = await getMeshesFromSlice(sliceFile, collector).catch((err) => {
      logger.error(err)
      return []
    })
    if (!meshes.length) {
      logger.warn('missing meshes', item.HouseItemID, sliceFile)
      continue
    }
    await collector.addAsset({
      appearance: null,
      meshes: meshes,
      outDir: outDir,
      outFile: [item.HouseItemID, 'PrefabPath'].join('-'),
    })
  }
}

async function getMeshesFromSlice(sliceFile: string, collector: AssetCollector) {
  logger.debug('reading slice', sliceFile)
  const sliceJSON = await readJsonFile(sliceFile)
  const meshes = await getHousingItemMeshes(sliceJSON)
  const result: ModelMeshAsset[] = []
  for (let { model, material, transform } of meshes) {
    if (!model) {
      continue
    }
    if (path.extname(model) === '.cdf') {
      const cdfMeshes = await getModelsFromCdf(path.join(collector.sourceRoot, model))
      for (const mesh of cdfMeshes) {
        result.push({
          model: mesh.model,
          material: mesh.material,
          transform: transform, // TODO: cdf may also define a transform
        })
      }
    } else {
      result.push({
        model,
        material: material || (await getNearestMaterial(model, collector)),
        transform,
      })
    }
  }
  return result
}

async function getNearestMaterial(model: string, collector: AssetCollector) {
  if (!model) {
    return null
  }
  // TODO: get material from model
  const materials = await glob([path.join(collector.sourceRoot, path.dirname(model), '*.mtl')])
  if (materials.length) {
    return path.relative(collector.sourceRoot, materials[0])
  }
  return null
}
