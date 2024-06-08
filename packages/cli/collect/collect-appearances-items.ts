import path from 'node:path'
import { CharacterDefinition, getCDFSkinsOrCloth, readCDF, resolveCDFAsset } from '../file-formats/cdf'
import { DEFAULT_MATERIAL } from '../file-formats/resolvers'
import { ItemAppearanceDefinition, MeshAssetNode } from '../types'
import { glob, logger, readJSONFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectItemsOptions {
  maleChrFile?: string
  femaleChrFile?: string
  filter?: (item: ItemAppearanceDefinition) => boolean
}

export async function collectItemAppearances(collector: AssetCollector, options: CollectItemsOptions) {
  const table = await glob([path.join(collector.tablesDir, 'javelindata_itemappearancedefinitions.json')])
    .then((files) => {
      return Promise.all(files.map((file) => readJSONFile<ItemAppearanceDefinition[]>(file)))
    })
    .then((results) => results.flat())

  // Skin1 and Material1 is the primary model/material pair for the appearance. All items have this.
  // Skin2 is filler geometry, adds a naked skin if the item is not fully covered
  // ShortsleeveChestSkin is alternative to Skin1 e.g. for chest pieces when the arms are covered with gloves
  // AppearanceCDF is on chest pieces only but contains full gearset character. This is where Skirt and Cape geometry is to find.

  const maleChr = await getCharacterBones(options.maleChrFile, collector)
  const femaleChr = await getCharacterBones(options.femaleChrFile, collector)

  const outDir = 'itemappearances'
  await withProgressBar({ name: 'Scan Items', tasks: table }, async (item) => {
    if (options.filter && !options.filter(item)) {
      return
    }
    if (!item.Skin1 || !item.Material1) {
      // all items should have Skin1 and Material1
      return
    }

    const attachments: MeshAssetNode[] = await getCloth(item, collector)
    const gender = item.Gender?.toLowerCase()
    if (gender === 'male' && maleChr) {
      attachments.unshift(...maleChr)
    }
    if (gender === 'female' && femaleChr) {
      attachments.unshift(...femaleChr)
    }
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
  })
}

async function getCloth(item: ItemAppearanceDefinition, options: { inputDir: string }) {
  const result: Array<MeshAssetNode> = []
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

async function getCharacterBones(chrFile: string, options: { inputDir: string }): Promise<MeshAssetNode[]> {
  const result: MeshAssetNode[] = []
  if (!chrFile) {
    return result
  }

  if (path.extname(chrFile) === '.cdf') {
    const asset = await resolveCDFAsset(chrFile, {
      inputDir: options.inputDir,
      animations: false,
    })
    result.push({
      model: asset.model,
      material: DEFAULT_MATERIAL,
      ignoreGeometry: true,
      ignoreSkin: false,
      transform: null,
    })
    for (const mesh of asset.meshes) {
      result.push({
        model: mesh.model,
        material: DEFAULT_MATERIAL,
        ignoreGeometry: true,
        ignoreSkin: false,
        transform: null,
      })
    }
    return result
  }

  if (!chrFile || !chrFile.endsWith('.chr')) {
    return result
  }
  result.push({
    model: chrFile,
    material: null,
    ignoreGeometry: true,
    ignoreSkin: false,
    transform: null,
  })
  return result
}
