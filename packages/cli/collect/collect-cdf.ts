import { resolveCDFAsset } from '../file-formats/cdf'
import { logger } from '../utils'
import { AssetCollector } from './collector'

export interface CollectCdfOptions {
  files: string[]
}

export async function collectCdf(collector: AssetCollector, options: CollectCdfOptions) {
  for (const file of options.files) {
    const asset = await resolveCDFAsset(file, { inputDir: collector.inputDir }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, file)
    })
    if (!asset) {
      continue
    }

    await collector.collect({
      meshes: asset.meshes.map(({ model, material }) => {
        return {
          model,
          material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      outFile: file.toLowerCase(),
    })
  }
}
