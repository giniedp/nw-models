import path from 'node:path'
import { CharacterDefinition, getCDFSkinsOrCloth, readCDF } from '../file-formats/cdf'
import { ItemAppearanceDefinition, ModelMeshAsset } from '../types'
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

  // Skin1 and Material1 is the primary model/material pair for the appearance. All items have this.
  // Skin2 is filler geometry, adds a naked skin if the item is not fully covered
  // ShortsleeveChestSkin is alternative to Skin1 e.g. for chest pieces when the arms are covered with gloves
  // AppearanceCDF is on chest pieces only but contains full gearset character. This is where Skirt and Cape geometry is to find.

  const outDir = 'itemappearances'
  for (const item of table) {
    if (options.filter && !options.filter(item)) {
      continue
    }
    if (!item.Skin1 || !item.Material1) {
      // all items should have Skin1 and Material1
      continue
    }

    const attachments: ModelMeshAsset[] = await getCloth(item, collector)
    if (item.Skin1) {
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
          ...attachments,
        ],
        outFile: path.join(outDir, [item.ItemID, 'Skin1'].join('-')),
      })
    }
    if (item.ShortsleeveChestSkin) {
      await collector.collect({
        appearance: item,
        meshes: [
          {
            model: item.ShortsleeveChestSkin,
            material: item.Material1,
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          },
          ...attachments,
        ],
        outFile: path.join(outDir, [item.ItemID, 'ShortsleeveChestSkin'].join('-')),
      })
    }
  }
}

async function getCloth(item: ItemAppearanceDefinition, options: { inputDir: string }) {
  const result: Array<ModelMeshAsset> = []
  if (!item.AppearanceCDF) {
    return result
  }
  const cdfFile = path.resolve(options.inputDir, item.AppearanceCDF)
  const cdf = await readCDF(cdfFile).catch((err): CharacterDefinition => {
    logger.error(`Failed to read CDF file ${cdfFile}`)
    return null
  })
  if (!cdf) {
    return result
  }
  const cloth = getCDFSkinsOrCloth(cdf)?.filter((it) => it.type === 'CA_CLOTH')
  if (!cloth) {
    return result
  }
  for (const item of cloth) {
    result.push({
      model: item.model,
      material: item.material,
      ignoreGeometry: false,
      ignoreSkin: false,
      transform: null,
    })
  }
  return result
}
