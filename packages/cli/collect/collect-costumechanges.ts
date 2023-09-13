import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { CostumeChanges } from '../types'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectCostumeChanges(items: CostumeChanges[], collector: AssetCollector) {
  const outDir = 'costumechanges'
  for (const item of items) {
    if (item.CostumeChangeMesh && path.extname(item.CostumeChangeMesh) === '.cdf') {
      await getModelsFromCdf(collector.gfs.absolute(item.CostumeChangeMesh))
        .then((meshes) => {
          return collector.addAsset({
            meshes: meshes.map(({ model, material }) => {
              return {
                model,
                material,
                hash: null,
              }
            }),
            outDir: outDir,
            outFile: [item.CostumeChangeId, 'Mesh'].join('-'),
          })
        })
        .catch(() => {
          logger.warn(`failed to read`, item.CostumeChangeMesh)
        })
    }
  }
}
