import path from 'node:path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { getModelsFromSlice } from '../file-formats/dynamicslice'
import { HousingTableSchema, Housingitems, MeshAssetNode } from '../types'
import { glob, logger, readJSONFile } from '../utils'
import { AssetCollector } from './collector'

export interface CollectHousingItemsOptions {
  filter?: (item: Housingitems) => boolean
}

export async function collectHousingItems(collector: AssetCollector, options: CollectHousingItemsOptions) {
  const files = await glob([
    path.join(collector.tablesDir, 'javelindata_housingitems.json'),
    path.join(collector.tablesDir, 'mtx', '*_housingitems_mtx.json'),
  ])

  for (const file of files) {
    const table = await readJSONFile(file, HousingTableSchema)
    for (const item of table) {
      if (!item.PrefabPath) {
        continue
      }
      if (options.filter && !options.filter(item)) {
        continue
      }
      const sliceFile = path.join(collector.slicesDir, item.PrefabPath) + '.dynamicslice.json'
      if (!sliceFile) {
        logger.warn('missing slice', sliceFile)
        continue
      }
      const meshes = await getMeshesFromSlice(sliceFile, collector).catch((err): MeshAssetNode[] => {
        logger.error(err)
        return []
      })
      if (!meshes.length) {
        logger.warn('missing meshes', sliceFile)
        return
      }
      await collector.collect({
        animations: null,
        appearance: null,
        meshes: meshes,
        // all housing prefabs are already prefixed with 'housing/'
        outFile: item.PrefabPath.toLowerCase(),
      })
    }
  }
}

async function getMeshesFromSlice(
  sliceFile: string,
  options: {
    inputDir: string
    catalog: Record<string, string>
  },
) {
  const sliceJSON = await readJSONFile<unknown>(sliceFile)
  const meshes = await getModelsFromSlice({
    slice: sliceJSON,
    catalog: options.catalog,
  })
  const result: MeshAssetNode[] = []

  for (const { model, material, transform } of meshes) {
    if (!model) {
      continue
    }
    if (path.extname(model) !== '.cdf') {
      result.push({
        model,
        material,
        transform,
        ignoreGeometry: false,
        ignoreSkin: false,
      })
      continue
    }
    const cdfMeshes = await getModelsFromCdf(path.resolve(options.inputDir, model))
    for (const mesh of cdfMeshes) {
      result.push({
        model: mesh.model,
        material: mesh.material,
        transform: transform,
        ignoreGeometry: false,
        ignoreSkin: false,
      })
    }
  }
  return result
}
