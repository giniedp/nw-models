import { ItemdefinitionsWeapons } from '../types'
import { AssetCollector } from './asset-collector'

export async function collectWeapons(items: ItemdefinitionsWeapons[], collector: AssetCollector) {
  const outDir = 'weapons'
  for (const item of items) {
    await collector.addAsset({
      appearance: null,
      meshes: [
        {
          model: item.SkinOverride1,
          material: item.MaterialOverride1,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.WeaponID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: null,
      meshes: [
        {
          model: item.SkinOverride2,
          material: item.MaterialOverride1,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.WeaponID, 'SkinOverride2'].join('-'),
    })
  }
}
