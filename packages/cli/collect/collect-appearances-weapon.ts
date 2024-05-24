import path from 'path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { WeaponAppearanceDefinition } from '../types'
import { logger, readJSONFile } from '../utils'
import { AssetCollector } from './collector'

export interface CollectWeaponsOptions {
  filter?: (item: WeaponAppearanceDefinition) => boolean
}

export async function collectWeaponAppearances(collector: AssetCollector, options: CollectWeaponsOptions) {
  const table = await Promise.all(
    [
      'javelindata_itemdefinitions_weaponappearances.json',
      'javelindata_itemdefinitions_weaponappearances_mountattachments.json',
    ].map((file) => {
      return readJSONFile<WeaponAppearanceDefinition[]>(path.join(collector.tablesDir, file))
    }),
  ).then((results) => {
    return results.flat()
  })
  console.info('Collecting weapon appearances', table.length)
  //
  for (const item of table) {
    if (options.filter && !options.filter(item)) {
      continue
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
      outFile: path.join('weaponappearances', [item.WeaponAppearanceID, 'SkinOverride1'].join('-')),
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
      outFile: path.join('weaponappearances', [item.WeaponAppearanceID, 'SkinOverride2'].join('-')),
    })
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cdf') {
      const asset = await resolveCDFAsset(item.MeshOverride, {
        inputDir: collector.inputDir,
        skipAnimations: true,
      }).catch((err) => {
        logger.error(err)
        logger.warn(`failed to read`, item.MeshOverride)
      })
      if (!asset) {
        continue
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
        outFile: path.join('weaponappearances', [item.WeaponAppearanceID, 'MeshOverride'].join('-')),
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
        outFile: path.join('weaponappearances', [item.WeaponAppearanceID, 'MeshOverride'].join('-')),
      })
    }
  }
}
