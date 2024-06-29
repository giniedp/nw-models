import path from 'node:path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { WeaponAppearanceDefinition } from '../types'
import { logger } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectWeaponsOptions {
  filter?: (item: WeaponAppearanceDefinition) => boolean
  embedApperance?: boolean
}

export async function collectWeaponAppearances(collector: AssetCollector, options: CollectWeaponsOptions) {
  const table = await Promise.all(
    [
      'javelindata_itemdefinitions_weaponappearances.json',
      'javelindata_itemdefinitions_weaponappearances_mountattachments.json',
    ].map((file) => {
      return collector.readTable<WeaponAppearanceDefinition[]>(file)
    }),
  ).then((results) => results.flat())

  await withProgressBar({ name: 'Scan Weapons', tasks: table }, async (item) => {
    if (options.filter && !options.filter(item)) {
      return
    }
    if (!item.MeshOverride) {
      return
    }
    // HING: SkinOverride1 and SkinOverride2 are ignored.
    // They are not useful for weapon appearances. Usually contain bow strings.

    let outFile = item.MeshOverride
    if (options.embedApperance) {
      outFile = path.join('weaponappearances', [item.WeaponAppearanceID, 'MeshOverride'].join('-'))
    }
    if (path.extname(item.MeshOverride) === '.cdf') {
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
        appearance: item,
        meshes: asset.meshes.map(({ model, material }) => {
          return {
            model,
            material,
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          }
        }),
        outFile,
      })
    }
    if (path.extname(item.MeshOverride) === '.cgf') {
      await collector.collect({
        appearance: item,
        meshes: [
          {
            model: item.MeshOverride,
            material: null, // will be resolved from the model
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          },
        ],
        outFile,
      })
    }
  })
}
