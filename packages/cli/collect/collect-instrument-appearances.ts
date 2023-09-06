import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { InstrumentAppearance } from '../types'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectInstrumentAppearances(items: InstrumentAppearance[], collector: AssetCollector) {
  const outDir = 'instrumentappearances'
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
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride2,
          material: item.MaterialOverride2,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride2'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride3,
          material: item.MaterialOverride3,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride3'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.SkinOverride4,
          material: item.MaterialOverride4,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride4'].join('-'),
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
            outDir: outDir,
            outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
          })
        })
        .catch(() => {
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
        outDir: 'instrumentappearances',
        outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
      })
    }
  }
}
