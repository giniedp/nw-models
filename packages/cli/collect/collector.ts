import { DEFAULT_MATERIAL, resolveCgfPath, resolveMtlFromCgf, resolveMtlPath } from '../file-formats/resolvers'
import { ModelAsset, ModelMeshAsset } from '../types'
import { CaseInsensitiveMap } from '../utils/caseinsensitive-map'
import { logger } from '../utils/logger'

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
}

export function assetCollector({ inputDir, tablesDir, slicesDir, catalog, modelFormat }: AssetCollectorOptions) {
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function collect({
    appearance,
    meshes,
    outFile,
    fallbackMaterial,
    animations,
  }: ModelAsset & { fallbackMaterial?: string }) {
    const refId = outFile
    const resolvedMeshes: ModelMeshAsset[] = []
    if (assets.has(refId)) {
      logger.warn(`skipped duplicate asset: ${refId}`)
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
    assets.set(refId, {
      animations: animations,
      appearance: appearance,
      meshes: resolvedMeshes,
      outFile: outFile + '.' + modelFormat,
    })
  }
  return {
    inputDir,
    tablesDir,
    slicesDir,
    catalog,
    assets: () => Array.from(assets.values()),
    collect,
  } satisfies AssetCollector
}
