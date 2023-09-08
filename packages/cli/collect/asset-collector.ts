import { createHash } from 'crypto'
import path from 'path'
import { gameFileSystem } from '../file-formats/game-fs'
import { ModelAsset, ModelMeshAsset } from '../types'
import { CaseInsensitiveMap } from '../utils/caseinsensitive-map'
import { logger } from '../utils/logger'

export type AssetCollector = ReturnType<typeof assetCollector>
export function assetCollector({ sourceRoot, extname }: { sourceRoot: string; extname: string }) {
  const gfs = gameFileSystem(sourceRoot)
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset({
    appearance,
    meshes,
    outDir,
    outFile,
    fallbackMaterial,
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

      let model = gfs.resolveModelPath(mesh.model)
      if (!model) {
        if (mesh.model) {
          logger.warn(`missing model ${mesh.model} for ${logTag}`)
        }
        continue
      }
      if (mesh.model !== model) {
        logger.debug(`resolved model ${mesh.model} -> ${model} for ${logTag}`)
      }

      let material = await gfs.resolveMaterialPath([mesh.material, fallbackMaterial])
      if (!material) {
        material = await gfs.resolveMaterialForModel(model)
        if (material) {
          logger.debug(`resolved material ${material} from model ${model} for ${logTag}`)
        }
      }
      if (!material) {
        if (mesh.model) {
          logger.warn(`missing material for ${logTag}`)
        }
        material = gfs.defaults.mtl
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
      appearance: appearance,
      meshes: resolvedMeshes,
      outDir: outDir,
      outFile: outFile + extname,
    })
  }
  return {
    gfs: gfs,
    sourceRoot: sourceRoot,
    values: () => assets.values(),
    addAsset,
  }
}
