import { logger } from '../utils/logger'
import { getModelsFromCdf } from '../file-formats/cdf'
import { ItemAppearanceDefinition } from '../types'
import { AssetCollector } from './asset-collector'
import path from 'path'

export async function collectItemAppearances(items: ItemAppearanceDefinition[], collector: AssetCollector) {
  const outDir = 'itemappearances'
  for (const item of items) {
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.Skin1,
          material: item.Material1,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.ItemID, 'Skin1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      meshes: [
        {
          model: item.Skin2,
          // TODO: resolve material from skin. The fallback material is not correct here
          material: item.Material2 || item.Material1,
          hash: null,
        },
      ],
      outDir: outDir,
      outFile: [item.ItemID, 'Skin2'].join('-'),
    })

    // ===========================================================
    // HINT: AppearanceCDF is usually set on a Chest piece and points to a CDF file
    //       that contains the mesh and materials for the whole appearance
    // ===========================================================
    if (item.AppearanceCDF) {
      await getModelsFromCdf(path.join(collector.sourceRoot, item.AppearanceCDF))
        .then((models) => {
          collector.addAsset({
            appearance: item,
            // fallback is just for debugging the model, do not use it
            // fallbackMaterial: item.Material1 || item.Material2,
            meshes: models.map(({ model, material }) => {
              return {
                model,
                material,
                hash: null,
              }
            }),
            outDir: outDir,
            outFile: [item.ItemID, 'AppearanceCDF'].join('-'),
          })
        })
        .catch(() => {
          logger.warn(`failed to read`, item.AppearanceCDF)
        })
    }

    // ===========================================================
    // HINT: different variations of arms with and without sleeves
    // ===========================================================

    // await collector.addAsset({
    //   appearance: item,
    //   model: item.ShortsleeveChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'ShortsleeveChestSkin'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.HandsNoForearmsSkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'HandsNoForearmsSkin'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.LeftHandOnlySkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'LeftHandOnlySkin'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.RightHandOnlySkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'RightHandOnlySkin'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.LeftSleeveOnlyChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'LeftSleeveOnlyChestSkin'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.RightSleeveOnlyChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'RightSleeveOnlyChestSkin'].join('-'),
    // })
  }
}
