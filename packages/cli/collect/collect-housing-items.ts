import path from 'node:path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { getModelsFromSlice } from '../file-formats/dynamicslice'
import { HousingTableSchema, Housingitems, MeshAssetNode } from '../types'
import { glob, logger, readJSONFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectHousingItemsOptions {
  filter?: (item: Housingitems) => boolean
}

export async function collectHousingItems(collector: AssetCollector, options: CollectHousingItemsOptions) {
  const table = await glob([
    path.join(collector.tablesDir, 'javelindata_housingitems.json'),
    path.join(collector.tablesDir, 'mtx', '*_housingitems_mtx.json'),
  ])
    .then((files) =>
      Promise.all(
        files.map((file) => collector.readTable(path.relative(collector.tablesDir, file), HousingTableSchema)),
      ),
    )
    .then((tables) => tables.flat())

  await withProgressBar({ name: 'Scan Housing Items', tasks: table }, async (item) => {
    if (!item.PrefabPath) {
      return
    }
    if (options.filter && !options.filter(item)) {
      return
    }
    const sliceFile = path.join(collector.slicesDir, item.PrefabPath) + '.dynamicslice.json'
    if (!sliceFile) {
      logger.warn('missing slice', sliceFile)
      return
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
  })
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
