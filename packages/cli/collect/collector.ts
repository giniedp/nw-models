import path from 'node:path'
import { DEFAULT_MATERIAL, resolveCgfPath, resolveMtlFromCgf, resolveMtlPath } from '../file-formats/resolvers'
import { MeshAssetNode, ModelAsset } from '../types'
import { CaseInsensitiveMap } from '../utils/caseinsensitive-map'
import { readJSONFile } from '../utils/file-utils'
import { logger } from '../utils/logger'
import { ZodSchema, z } from 'zod'

export interface AssetCollectorOptions {
  inputDir: string
  tablesDir: string
  slicesDir: string
  catalog: Record<string, string>
  modelFormat: 'gltf' | 'glb'
}

export interface AssetCollector {
  inputDir: string
  tablesDir: string
  slicesDir: string
  catalog: Record<string, string>
  collect: (asset: ModelAsset & { fallbackMaterial?: string }) => Promise<void>
  assets: () => ModelAsset[]
  readTable: <T>(file: string, schema?: ZodSchema<T>) => Promise<T>
}

export function assetCollector({ inputDir, tablesDir, slicesDir, catalog, modelFormat }: AssetCollectorOptions) {
  const models = new CaseInsensitiveMap<string, ModelAsset>()

  async function collect({
    appearance,
    meshes,
    outFile,
    fallbackMaterial,
    animations,
    lights,
    cameras,
    entities,
  }: ModelAsset & { fallbackMaterial?: string }) {
    const refId = outFile
    const resolvedMeshes: MeshAssetNode[] = []
    if (models.has(refId)) {
      logger.info(`skipped duplicate asset: ${refId}`)
      return
    }
    for (const mesh of meshes) {
      if (!mesh.model) {
        continue
      }

      let model = resolveCgfPath(mesh.model, {
        inputDir,
      })
      if (!model) {
        logger.warn(`missing model ${mesh.model}`)
        continue
      }

      let material = await resolveMtlPath([mesh.material, fallbackMaterial], {
        inputDir,
      })
      if (!material) {
        material = await resolveMtlFromCgf(model, { inputDir, catalog })
      }
      if (!material) {
        logger.warn(`missing material for model ${model}`)
        material = DEFAULT_MATERIAL
      }

      resolvedMeshes.push({
        ...mesh,
        model: model,
        material: material,
      })
    }
    if (!resolvedMeshes.length) {
      return
    }
    models.set(refId, {
      lights: lights,
      cameras: cameras,
      entities: entities,
      meshes: resolvedMeshes,
      animations: animations,
      appearance: appearance,
      outFile: outFile + '.' + modelFormat,
    })
  }

  async function readTable<T>(file: string, schema?: ZodSchema<T>): Promise<T> {
    const data: any = await readJSONFile(path.resolve(tablesDir, file))

    if (Array.isArray(data)) {
      return schema ? schema.parse(data) : data as T
    }
    if (data && 'rows' in data && Array.isArray(data.rows)) {
      return schema ? schema.parse(data.rows) : data.rows
    }
    throw new Error(`invalid table format: ${file}`)
  }

  return {
    inputDir,
    tablesDir,
    slicesDir,
    catalog,
    assets: () => Array.from(models.values()),
    collect: collect,
    readTable,
  } satisfies AssetCollector
}
