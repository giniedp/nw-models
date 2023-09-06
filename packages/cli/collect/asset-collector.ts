import { createHash } from 'crypto'
import path from 'path'
import { ModelAsset, ModelMeshAsset } from '../types'
import { CaseInsensitiveMap } from '../utils/caseinsensitive-map'
import { logger } from '../utils/logger'
import { fixModelPath, fixMtlPath } from './fix-path'

export type AssetCollector = ReturnType<typeof assetCollector>
export function assetCollector({ sourceRoot, extname }: { sourceRoot: string; extname: string }) {
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset({
    appearance,
    meshes,
    outDir,
    outFile,
    fallbackMaterial,
  }: ModelAsset & { fallbackMaterial?: string }) {
    meshes = meshes
      .map((mesh): ModelMeshAsset => {
        const material = fixMtlPath({
          sourceDir: sourceRoot,
          mtlFile: mesh.material,
          mtlFileFallback: fallbackMaterial,
          logTag: [outDir, outFile].join(' '),
        })
        const model = fixModelPath(sourceRoot, mesh.model, [outDir, outFile].join(' '))
        if (!model || !material) {
          return null
        }
        return {
          ...mesh,
          model: model,
          material: material,
          hash: createHash('md5').update(`${model}-${material}`).digest('hex'),
        }
      })
      .filter((it) => !!it)
    if (!meshes.length) {
      return
    }
    const refId = path.join(outDir, outFile)
    if (assets.has(refId)) {
      logger.warn(`skipped duplicate asset: ${refId}`)
    } else {
      assets.set(refId, {
        appearance: appearance,
        meshes: meshes,
        outDir: outDir,
        outFile: outFile + extname,
      })
    }
  }
  return {
    sourceRoot: sourceRoot,
    values: () => assets.values(),
    addAsset,
  }
}
