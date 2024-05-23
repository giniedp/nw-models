import path from 'path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { CostumeChanges, CostumeChangesSchema } from '../types'
import { logger, readJSONFile } from '../utils'
import { AssetCollector } from './collector'

export interface CollectCostumeChangesOptions {
  filter?: (item: CostumeChanges) => boolean
}

export async function collectCostumeChanges(collector: AssetCollector, options: CollectCostumeChangesOptions) {
  const table = await readJSONFile(
    path.join(collector.tablesDir, 'costumechanges', 'javelindata_costumechanges.json'),
    CostumeChangesSchema,
  )

  for (const item of table) {
    const modelFile = item.CostumeChangeMesh
    if (!modelFile || path.extname(modelFile) !== '.cdf') {
      continue
    }
    if (options.filter && !options.filter(item as any)) {
      continue
    }
    const asset = await resolveCDFAsset(modelFile, { inputDir: collector.inputDir }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, modelFile)
    })
    if (!asset) {
      continue
    }

    await collector.collect({
      animations: [],
      meshes: asset.meshes.map(({ model, material }) => {
        return {
          model,
          material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      outFile: path.join('costumechanges', item.CostumeChangeId.toLowerCase()) ,
    })
  }
}
