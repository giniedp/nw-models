import fs from 'fs'
import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { getModelsFromSlice } from '../file-formats/dynamicslice'
import { ModelMeshAsset } from '../types'
import { glob, readJsonFile, replaceExtname } from '../utils/file-utils'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectSlices(slicesDir: string, items: string[], collector: AssetCollector) {
  const outDir = 'slices'
  items = await glob(items.map((it) => path.join(slicesDir, it)))
  for (const sliceFile of items) {
    await collectFromSlice({
      slicesDir,
      sliceFile,
      outDir,
      collector,
    })
  }
}

export async function collectFromSlice({
  slicesDir,
  sliceFile,
  outDir,
  collector,
}: {
  slicesDir: string
  sliceFile: string
  outDir: string
  collector: AssetCollector
}) {
  if (!fs.existsSync(sliceFile)) {
    logger.warn('missing slice', sliceFile)
    return
  }
  const meshes = await getMeshesFromSlice(sliceFile, collector).catch((err) => {
    logger.error(err)
    return []
  })
  if (!meshes.length) {
    logger.warn('missing meshes', sliceFile)
    return
  }
  await collector.addAsset({
    appearance: null,
    meshes: meshes,
    outDir: outDir,
    outFile: path.relative(slicesDir, replaceExtname(sliceFile, '')),
  })
}

async function getMeshesFromSlice(sliceFile: string, collector: AssetCollector) {
  const sliceJSON = await readJsonFile(sliceFile)
  const meshes = await getModelsFromSlice(sliceJSON)
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
        material: material,
        transform,
      })
    }
  }
  return result
}
