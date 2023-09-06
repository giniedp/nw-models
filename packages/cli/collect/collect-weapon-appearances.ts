import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { WeaponAppearanceDefinition } from '../types'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectWeaponAppearances(items: WeaponAppearanceDefinition[], collector: AssetCollector) {
  for (const item of items) {
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride1,
          material: item.MaterialOverride1,
          hash: null,
        },
      ],
      outDir: 'weaponappearances',
      outFile: [item.WeaponAppearanceID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride2,
          material: item.MaterialOverride1, // HINT: this is a guess, there is no `MaterialOverride2`
          hash: null,
        },
      ],
      outDir: 'weaponappearances',
      outFile: [item.WeaponAppearanceID, 'SkinOverride2'].join('-'),
    })
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cdf') {
      await getModelsFromCdf(path.join(collector.sourceRoot, item.MeshOverride))
        .then((meshes) => {
          return collector.addAsset({
            appearance: item,
            meshes: meshes.map(({ model, material }) => {
              return {
                model,
                material,
                hash: null,
              }
            }),
            outDir: 'weaponappearances',
            outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
          })
        })
        .catch((err) => {
          logger.error(err)
          logger.warn(`failed to read`, item.MeshOverride)
        })
    }
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cgf') {
      await collector.addAsset({
        appearance: item,
        meshes: [
          {
            model: item.MeshOverride,
            material: item.MaterialOverride1,
            hash: null,
          },
        ],
        outDir: 'weaponappearances',
        outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
      })
    }
  }
}
