import path from 'node:path'
import { ItemdefinitionsWeapons } from '../types'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectWeaponsOptions {
  filter?: (item: ItemdefinitionsWeapons) => boolean
}

export async function collectWeapons(collector: AssetCollector, options: CollectWeaponsOptions) {
  const table = await Promise.all(
    // prettier-ignore
    [
      'javelindata_itemdefinitions_weapons.json'
    ].map((it) => collector.readTable<ItemdefinitionsWeapons>(it)),
  ).then((it) => it.flat())

  await withProgressBar({ name: 'Scan Weapons', tasks: table }, async (item) => {
    if (options.filter && !options.filter(item)) {
      return
    }
    await collector.collect({
      appearance: null,
      meshes: [
        {
          model: item.SkinOverride1,
          material: item.MaterialOverride1,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join('weapon', [item.WeaponID, 'SkinOverride1'].join('-')),
    })
    await collector.collect({
      appearance: null,
      meshes: [
        {
          model: item.SkinOverride2,
          material: item.MaterialOverride1,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join('weapon', [item.WeaponID, 'SkinOverride2'].join('-')),
    })
  })
}
