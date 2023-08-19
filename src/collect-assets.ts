import { createHash } from 'crypto'
import * as fs from 'fs'
import { uniqBy } from 'lodash'
import * as path from 'path'
import { readCdf } from './file-formats/cdf'
import { loadMtlFile } from './file-formats/mtl'

import {
  getAppearanceId,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemDefinitionMaster,
  ItemdefinitionsWeapons,
  ModelAsset,
  WeaponAppearanceDefinition,
} from './types'
import { CaseInsensitiveMap, CaseInsensitiveSet, glob, logger, readJsonFile, replaceExtname } from './utils'

function toMap<T, K extends keyof T>(list: T[], key: K) {
  return new CaseInsensitiveMap<string, T>(list.map((item) => [item[key as string], item]))
}

export async function readTables({ tablesDir }: { tablesDir: string }) {
  const items = await glob([
    path.join(tablesDir, 'javelindata_itemdefinitions_master_*.json'),
    path.join(tablesDir, 'mtx', '*_itemdefinitions_*.json'),
  ])
    .then((items) => Promise.all(items.map((it) => readJsonFile<ItemDefinitionMaster[]>(it))))
    .then((data) => data.flat(1))
  const itemAppearances = await readJsonFile<ItemAppearanceDefinition[]>(
    path.join(tablesDir, 'javelindata_itemappearancedefinitions.json'),
  )
  const weaponAppearances = await readJsonFile<WeaponAppearanceDefinition[]>(
    path.join(tablesDir, 'javelindata_itemdefinitions_weaponappearances.json'),
  )
  const instrumentAppearances = await readJsonFile<InstrumentAppearance[]>(
    path.join(tablesDir, 'javelindata_itemdefinitions_instrumentsappearances.json'),
  )
  const weapons = await readJsonFile<ItemdefinitionsWeapons[]>(
    path.join(tablesDir, 'javelindata_itemdefinitions_weapons.json'),
  )
  return {
    items,
    itemAppearances,
    weaponAppearances,
    instrumentAppearances,
    weapons,
  }
}

export function fixMtlPath(sourceDir: string, mtlFile: string, logTag: string) {
  if (!mtlFile) {
    return null
  }

  if (fs.existsSync(path.join(sourceDir, mtlFile))) {
    return mtlFile
  }
  // materials are sometimes referenced wrongly
  // - tmp\assets\objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
  // should be
  // - tmp\assets\objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
  const candidate = path.join(path.dirname(mtlFile), '..', path.basename(mtlFile))
  if (mtlFile.includes('textures') && fs.existsSync(path.join(sourceDir, candidate))) {
    return candidate
  }

  logger.warn('missing material', mtlFile, `(${logTag})`)
  return null
}

export function fixModelPath(sourceDir: string, modelFile: string, logTag: string) {
  if (!modelFile) {
    return null
  }

  if (fs.existsSync(path.join(sourceDir, modelFile))) {
    return modelFile
  }
  logger.warn('missing model', modelFile, `(${logTag})`)
  return null
}

export async function collectAssets({
  items,
  itemAppearances,
  weaponAppearances,
  instrumentAppearances,
  weapons,
  sourceRoot,
}: {
  items: ItemDefinitionMaster[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  instrumentAppearances: InstrumentAppearance[]
  weapons: ItemdefinitionsWeapons[]
  sourceRoot: string
}) {
  const itemAppearancesMap = toMap(itemAppearances, 'ItemID')
  const weaponAppearancesMap = toMap(weaponAppearances, 'WeaponAppearanceID')
  const instrumentAppearancesMap = toMap(instrumentAppearances, 'WeaponAppearanceID')
  const weaponsMap = toMap(weapons, 'WeaponID')
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset(
    item: ItemDefinitionMaster,
    { appearance, tags, model, material }: Omit<ModelAsset, 'items' | 'refId' | 'modelMaterialHash'>,
  ) {
    material = fixMtlPath(sourceRoot, material, [item.ItemID, ...tags].join(' '))
    model = fixModelPath(sourceRoot, model, [item.ItemID, ...tags].join(' '))
    if (!model || !material) {
      return
    }
    const refId = `${getAppearanceId(appearance)}-${tags.join('-')}`.toLowerCase()
    if (!assets.has(refId)) {
      assets.set(refId, {
        refId: refId,
        items: [],
        model: model,
        material: material,
        appearance: appearance,
        modelMaterialHash: createHash('md5').update(`${model}-${material}`).digest('hex'),
        tags: tags,
      })
    }
    const asset = assets.get(refId)
    asset.items.push(item)
  }

  async function addArmor(item: ItemDefinitionMaster) {
    let appearance = itemAppearancesMap.get(item.ArmorAppearanceM)
    if (appearance) {
      await addAsset(item, {
        appearance,
        tags: ['male', item.ItemType],
        model: appearance.Skin1,
        material: appearance.Material1,
      })
    }
    appearance = itemAppearancesMap.get(item.ArmorAppearanceF)
    if (appearance) {
      await addAsset(item, {
        appearance,
        tags: ['female', item.ItemType],
        model: appearance.Skin1,
        material: appearance.Material1,
      })
    }
  }

  async function addWeapon(item: ItemDefinitionMaster) {
    const weaponAppearance = weaponAppearancesMap.get(item.WeaponAppearanceOverride)
    // TODO: research whether this is used to override the appearance of the weapon
    // const weapon = weaponsMap.get(item.ItemStatsRef)
    
    if (!weaponAppearance) {
      return
    }
    let appearance = itemAppearancesMap.get(weaponAppearance.Appearance)
    if (appearance) {
      await addAsset(item, {
        appearance,
        tags: ['male', item.ItemType],
        model: appearance.Skin1, 
        material: appearance.Material1,
      })
      await addAsset(item, {
        appearance,
        tags: ['male', item.ItemType, 'skin2'],
        model: appearance.Skin2, 
        material: appearance.Material1 || appearance.Material2,
      })
    }
    appearance = itemAppearancesMap.get(weaponAppearance.FemaleAppearance)
    if (appearance) {
      await addAsset(item, {
        appearance,
        tags: ['female', item.ItemType],
        model: appearance.Skin1,
        material: appearance.Material1,
      })
      await addAsset(item, {
        appearance,
        tags: ['female', item.ItemType, 'skin2'],
        model: appearance.Skin2, 
        material: appearance.Material1 || appearance.Material2,
      })
    }
  }

  async function addInstrumentOrWeaponMesh(item: ItemDefinitionMaster) {
    const wpa = weaponAppearancesMap.get(item.WeaponAppearanceOverride) || instrumentAppearancesMap.get(item.WeaponAppearanceOverride)
    if (!wpa) {
      return
    }

    // TODO: research whether this is used to override the appearance of the weapon
    const weapon = weaponsMap.get(item.ItemStatsRef)
    const meshOverride = wpa.MeshOverride
    
    if (path.extname(meshOverride) === '.cdf') {
      await readCdf(path.join(sourceRoot, meshOverride))
        .then(({ model, material }) => {
          addAsset(item, {
            appearance: wpa,
            model: model,
            material: material,
            tags: ['mesh', item.ItemType],
          })
        })
        .catch(() => {
          logger.warn(`failed to read`, meshOverride)
        })
    }
    if (path.extname(meshOverride) === '.cgf') {
      addAsset(item, {
        appearance: wpa,
        model: meshOverride,
        material: weapon.MaterialOverride1,
        tags: ['mesh', item.ItemType],
      })
    }
  }

  for (const item of items) {
    await addArmor(item)
    await addWeapon(item)
    await addInstrumentOrWeaponMesh(item)
  }

  return Array.from(assets.values())
}

export function filterItemsByItemId(id: string, items: ItemDefinitionMaster[]) {
  if (!id) {
    return items
  }
  const ids = id.split(',').map((it) => it.toLowerCase())
  return items.filter((it) => {
    const itemId = it.ItemID.toLowerCase()
    return ids.some((id) => itemId.includes(id))
  })
}

export function filterAssetsByItemId(id: string, assets: ModelAsset[]) {
  if (!id) {
    return assets
  }
  const ids = id.split(',').map((it) => it.toLowerCase())
  return assets.filter((it) => {
    return it.items.some((item) => {
      const itemId = item.ItemID.toLowerCase()
      return ids.some((it) => itemId.includes(it))
    })
  })
}

export function filterAssetsBySkinName(skin: string, assets: ModelAsset[]) {
  if (!skin) {
    return assets
  }
  const skins = skin.split(',').map((it) => it.toLowerCase())
  return assets.filter((it) => {
    const skin = it.model.toLowerCase()
    return skins.some((it) => skin.includes(it))
  })
}

export function filterAssetsModelMaterialHash(hash: string, assets: ModelAsset[]) {
  if (!hash) {
    return assets
  }
  const hashes = hash.split(',').map((it) => it.toLowerCase())
  return assets.filter((it) => {
    const value = it.modelMaterialHash.toLowerCase()
    return hashes.some((it) => it === value)
  })
}

export async function collectTextures({ sourceRoot, assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    const mtl = await loadMtlFile(path.join(sourceRoot, asset.material))
    for (const it of mtl) {
      for (const texture of it.textures) {
        result.add(replaceExtname(texture.File, '.dds'))
      }
    }
  }
  return Array.from(result)
}

export async function collectModels({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  function identity(asset: ModelAsset) {
    if (asset.modelMaterialHash) {
      return asset.modelMaterialHash
    }
    return asset.model + asset.material
  }
  return uniqBy(assets, identity).map(({ model, material, modelMaterialHash }) => {
    return { model, material, modelMaterialHash }
  })
}

export async function collectMaterials({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    result.add(asset.material)
  }
  return Array.from(result)
}
