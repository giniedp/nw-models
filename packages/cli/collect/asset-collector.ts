import { createHash } from 'crypto'
import path from 'path'
import { gameFileSystem } from '../file-formats/game-fs'
import { ModelAsset, ModelMeshAsset } from '../types'
import { CaseInsensitiveMap } from '../utils/caseinsensitive-map'
import { logger } from '../utils/logger'

export interface AssetCollectorOptions {
  inputDir: string
  // convertDir: string
  // outputDir: string
  modelFormat: 'gltf' | 'glb'
}

export type AssetCollector = ReturnType<typeof assetCollector>
export function assetCollector(options: AssetCollectorOptions) {
  const inputFS = gameFileSystem(options.inputDir)
  // const convertFS = gameFileSystem(options.convertDir)
  // const outputFS = gameFileSystem(options.outputDir)

  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset({
    appearance,
    meshes,
    outDir,
    outFile,
    fallbackMaterial,
    animations,
  }: ModelAsset & { fallbackMaterial?: string }) {
    const refId = path.join(outDir, outFile)
    const resolvedMeshes: ModelMeshAsset[] = []
    const logTag = [outDir, outFile].join(' ')
    if (assets.has(refId)) {
      logger.warn(`skipped duplicate asset: ${refId}`)
      return
    }
    for (const mesh of meshes) {
      if (!mesh.model) {
        continue
      }

      let model = inputFS.resolveModelPath(mesh.model)
      if (!model) {
        if (mesh.model) {
          logger.warn(`missing model ${mesh.model} for ${logTag}`)
        }
        continue
      }
      if (mesh.model !== model) {
        logger.debug(`resolved model ${mesh.model} -> ${model} for ${logTag}`)
      }

      let material = await inputFS.resolveMaterialPath([mesh.material, fallbackMaterial])
      if (!material) {
        material = await inputFS.resolveMaterialForModel(model)
        if (material) {
          logger.debug(`resolved material ${material} from model ${model} for ${logTag}`)
        }
      }
      if (!material) {
        if (mesh.model) {
          logger.warn(`missing material for ${logTag}`)
        }
        material = inputFS.defaults.mtl
      }

      resolvedMeshes.push({
        ...mesh,
        model: model,
        material: material,
        hash: createHash('md5').update(`${model}-${material}`).digest('hex'),
      })
    }
    if (!resolvedMeshes.length) {
      return
    }
    assets.set(refId, {
      animations: animations,
      appearance: appearance,
      meshes: resolvedMeshes,
      outDir: outDir,
      outFile: outFile + '.' + options.modelFormat,
    })
  }
  return {
    inputFS,
    // convertFS,
    // outputFS,
    values: () => Array.from(assets.values()),
    addAsset,
  }
}
