import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { Mounts } from '../types'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectMounts(items: Mounts[], collector: AssetCollector) {
  const outDir = 'mounts'
  for (const item of items) {
    if (item.Mesh && path.extname(item.Mesh) === '.cdf') {
      await getModelsFromCdf(collector.gfs.absolute(item.Mesh))
        .then((meshes) => {
          return collector.addAsset({
            appearance: item,
            meshes: meshes.map(({ model, material }) => {
              return {
                model,
                material: item.Material || material,
                hash: null,
              }
            }),
            outDir: outDir,
            outFile: [item.MountId, 'Mesh'].join('-'),
          })
        })
        .catch(() => {
          logger.warn(`failed to read`, item.Mesh)
        })
    }
  }
}
