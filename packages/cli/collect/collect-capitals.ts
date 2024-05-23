import { mat4 } from '@gltf-transform/core'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import {
  getAssetPath,
  getCapitalPath,
  getModelFromSliceEntity,
  getTransformFromCapital,
  walkSlice,
} from '../file-formats/dynamicslice'
import { AZ__Entity, isPrefabSpawnerComponent } from '../file-formats/dynamicslice/types'
import { ModelMeshAsset } from '../types'
import { logger, readJSONFile, replaceExtname } from '../utils'
import { AssetCollector } from './collector'

export interface CollectSlicesOptions {
  files: string[]
  merge: boolean
  convertDir: string
  filter?: (item: Capital) => boolean
}

const CapitalSchema = z.object({
  Capitals: z.array(
    z.object({
      id: z.string(),
      worldPosition: z.optional(
        z.object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
        }),
      ),
      rotation: z.optional(
        z.object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
          w: z.number(),
        })
      ),
      scale: z.optional(z.number()),
      sliceName: z.string(),
      sliceAssetId: z.string(),
    }),
  ),
})
type Capital = z.infer<typeof CapitalSchema>['Capitals'][0]

export async function collectCapitals(collector: AssetCollector, options: CollectSlicesOptions) {
  const catalog = collector.catalog
  const inputDir = collector.inputDir
  const convertDir = options.convertDir
  const mergeResult: ModelMeshAsset[] = []

  for (const file of options.files) {
    const capitalFile = path.resolve(convertDir, file)
    const capitals = await readJSONFile(capitalFile, CapitalSchema)
    const capitalMeshes: ModelMeshAsset[] = []


    logger.debug('walk capital', capitalFile)
    for (const capital of capitals.Capitals || []) {
      if (options.filter && !options.filter(capital)) {
        continue
      }
      const slicePath = assetPathToSlicePath(getCapitalPath(collector.catalog, capital))
      const transform = getTransformFromCapital(capital)
      if (!slicePath) {
        logger.error('failed to get slice path', capital)
        continue
      }
      const sliceFile = path.resolve(convertDir, slicePath)
      await walkSlice(
        sliceFile,
        async (entry, transform, addSlice) => {
          const meshes = await getMeshesFromEntity(entry.entity, {
            inputDir,
            catalog,
            transform: transform,
          })
          capitalMeshes.push(...meshes)
          const prefab = entry.entity.components.find(isPrefabSpawnerComponent)
          if (!prefab || !prefab.m_sliceasset) {
            return
          }
          let assetPath = getAssetPath(collector.catalog, prefab.m_sliceasset)
          assetPath = assetPathToSlicePath(assetPath)
          if (!assetPath) {
            return
          }
          assetPath = path.resolve(convertDir, assetPath)
          if (fs.existsSync(assetPath)) {
            addSlice(assetPath)
          }
        },
        transform,
      )
    }

    if (options.merge) {
      mergeResult.push(...capitalMeshes)
    } else {
      await collector.collect({
        animations: null,
        appearance: null,
        meshes: capitalMeshes,
        // removes .json extension
        outFile: replaceExtname(file, ''),
      })
    }
  }

  if (mergeResult.length) {
    await collector.collect({
      animations: null,
      appearance: null,
      meshes: mergeResult,
      // removes .json extension
      outFile: replaceExtname(options.files[0], ''),
    })
  }
}

function assetPathToSlicePath(assetPath: string): string {
  if (!assetPath) {
    return null
  }
  if (assetPath.endsWith('.slice.meta')) {
    assetPath = assetPath.slice(0, -11) + '.dynamicslice'
  }
  if (!assetPath.endsWith('.dynamicslice')) {
    return null
  }
  return assetPath + '.json'
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

  logger.warn('skipped model', asset.model)
  return result
}
