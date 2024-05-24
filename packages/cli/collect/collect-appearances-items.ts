import path from 'path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { ItemAppearanceDefinition } from '../types'
import { glob, logger, readJSONFile } from '../utils'
import { AssetCollector } from './collector'

export interface CollectItemsOptions {
  filter?: (item: ItemAppearanceDefinition) => boolean
}

export async function collectItemAppearances(collector: AssetCollector, options: CollectItemsOptions) {
  const table = await glob([path.join(collector.tablesDir, 'javelindata_itemappearancedefinitions.json')])
    .then((files) => {
      return Promise.all(files.map((file) => readJSONFile<ItemAppearanceDefinition[]>(file)))
    })
    .then((results) => results.flat())

  console.info('Collecting item appearances', table.length)
  const outDir = 'itemappearances'
  for (const item of table) {
    if (options.filter && !options.filter(item)) {
      continue
    }
    await collector.collect({
      appearance: item,
      meshes: [
        {
          model: item.Skin1,
          material: item.Material1,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join(outDir, [item.ItemID, 'Skin1'].join('-')),
    })
    await collector.collect({
      appearance: item,
      meshes: [
        {
          model: item.Skin2,
          // TODO: resolve material from skin. The fallback material is not correct here
          material: item.Material2 || item.Material1,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: path.join(outDir, [item.ItemID, 'Skin2'].join('-')),
    })

    // ===========================================================
    // HINT: AppearanceCDF is usually set on a Chest piece and points to a CDF file
    //       that contains the mesh and materials for the whole appearance
    // ===========================================================
    if (item.AppearanceCDF) {
      const asset = await resolveCDFAsset(item.AppearanceCDF, {
        inputDir: collector.inputDir,
        skipAnimations: true,
      }).catch((err) => {
        logger.error(err)
        logger.warn(`failed to read`, item.AppearanceCDF)
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
        outFile: path.join(outDir, [item.ItemID, 'AppearanceCDF'].join('-')),
      })
    }

    // ===========================================================
    // HINT: different variations of arms with and without sleeves
    // ===========================================================

    //   appearance: item,
    //   model: item.ShortsleeveChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'ShortsleeveChestSkin'].join('-')),

    //   appearance: item,
    //   model: item.HandsNoForearmsSkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'HandsNoForearmsSkin'].join('-')),

    //   appearance: item,
    //   model: item.LeftHandOnlySkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'LeftHandOnlySkin'].join('-')),

    //   appearance: item,
    //   model: item.RightHandOnlySkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'RightHandOnlySkin'].join('-')),

    //   appearance: item,
    //   model: item.LeftSleeveOnlyChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'LeftSleeveOnlyChestSkin'].join('-')),

    //   appearance: item,
    //   model: item.RightSleeveOnlyChestSkin,
    //   material: item.Material1 || item.Material2,
    //   outFile: path.join(outDir, [item.ItemID, 'RightSleeveOnlyChestSkin'].join('-')),
  }
}
