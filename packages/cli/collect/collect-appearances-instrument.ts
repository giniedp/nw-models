import path from 'node:path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { InstrumentAppearance } from '../types'
import { logger, readJSONFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectInstrumentOptions {
  filter?: (item: InstrumentAppearance) => boolean
}

export async function collectInstrumentAppearances(collector: AssetCollector, options: CollectInstrumentOptions) {
  const table = await Promise.all(
    ['javelindata_itemdefinitions_instrumentsappearances.json'].map((file) => {
      return readJSONFile<InstrumentAppearance[]>(path.join(collector.tablesDir, file))
    }),
  ).then((results) => {
    return results.flat()
  })

  await withProgressBar({ name: 'Scan Instruments', tasks: table }, async (item) => {
    if (options.filter && !options.filter(item)) {
      return
    }
    await collector.collect({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride1,
          material: item.MaterialOverride1,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join('instrumentappearances', [item.WeaponAppearanceID, 'SkinOverride1'].join('-')),
    })
    await collector.collect({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride2,
          material: item.MaterialOverride1, // HINT: this is a guess, there is no `MaterialOverride2`
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join('instrumentappearances', [item.WeaponAppearanceID, 'SkinOverride2'].join('-')),
    })
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cdf') {
      const asset = await resolveCDFAsset(item.MeshOverride, {
        inputDir: collector.inputDir,
        animations: false,
      }).catch((err) => {
        logger.error(err)
        logger.warn(`failed to read`, item.MeshOverride)
      })
      if (!asset) {
        return
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
        outFile: path.join('instrumentappearances', [item.WeaponAppearanceID, 'MeshOverride'].join('-')),
      })
    }
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cgf') {
      await collector.collect({
        appearance: item,
        meshes: [
          {
            model: item.MeshOverride,
            material: item.MaterialOverride1,
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          },
        ],
        outFile: path.join('instrumentappearances', [item.WeaponAppearanceID, 'MeshOverride'].join('-')),
      })
    }
  })
}
