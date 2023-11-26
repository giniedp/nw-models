import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectCDF(items: string[], collector: AssetCollector) {
  for (const file of items) {
    if (path.extname(file) === '.cdf') {
      await getModelsFromCdf(path.join(collector.sourceRoot, file))
        .then((meshes) => {
          return collector.addAsset({
            meshes: meshes.map(({ model, material }) => {
              return {
                model,
                material,
                hash: null,
              }
            }),
            outDir: 'files',
            outFile: path.join(path.dirname(file), path.basename(file, path.extname(file))),
          })
        })
        .catch((err) => {
          logger.error(err)
          logger.warn(`failed to read`, file)
        })
    }
  }
}
