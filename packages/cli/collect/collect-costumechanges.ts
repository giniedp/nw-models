import path from 'node:path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { CostumeChanges, CostumeChangesSchema } from '../types'
import { logger } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectCostumeChangesOptions {
  filter?: (item: CostumeChanges) => boolean
}

export async function collectCostumeChanges(collector: AssetCollector, options: CollectCostumeChangesOptions) {
  const table = await Promise.all(
    ['costumechanges/javelindata_costumechanges.json'].map((file) => {
      return collector.readTable(file, CostumeChangesSchema)
    }),
  ).then((results) => results.flat())

  await withProgressBar({ name: 'Scan Costumes', tasks: table }, async (item) => {
    const modelFile = item.CostumeChangeMesh
    if (!modelFile || path.extname(modelFile) !== '.cdf') {
      return
    }
    if (options.filter && !options.filter(item as any)) {
      return
    }
    const asset = await resolveCDFAsset(modelFile, {
      inputDir: collector.inputDir,
      animations: false,
    }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, modelFile)
    })
    if (!asset) {
      return
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
      outFile: path.join('costumechanges', item.CostumeChangeId.toLowerCase()),
    })
  })
}
