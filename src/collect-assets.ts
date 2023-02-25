import * as path from 'path'
import * as fs from 'fs'
import { readCdf } from './file-formats/cdf'
import { getMaterialFileForSkin } from './file-formats/cgf'
import { loadMtlFile } from './file-formats/mtl'

import {
  Appearance,
  getAppearanceId,
  ItemAppearanceDefinition,
  ItemDefinitionMaster,
  ModelAsset,
  WeaponAppearanceDefinition,
} from './types'
import { CaseInsensitiveMap, CaseInsensitiveSet, glob, logger, readJsonFile, replaceExtname } from './utils'
import { uniqBy } from 'lodash'

function toMap<T, K extends keyof T>(list: T[], key: K) {
  return new CaseInsensitiveMap<string, T>(list.map((item) => [item[key as string], item]))
}

export async function readTables({ tablesDir }: { tablesDir: string }) {
  const items = await glob(path.join(tablesDir, 'javelindata_itemdefinitions_master_*.json'))
    .then((items) => Promise.all(items.map((it) => readJsonFile<ItemDefinitionMaster[]>(it))))
    .then((data) => data.flat(1))
  const appearances = await readJsonFile<ItemAppearanceDefinition[]>(
    path.join(tablesDir, 'javelindata_itemappearancedefinitions.json'),
  )
  const weapons = await readJsonFile<WeaponAppearanceDefinition[]>(
    path.join(tablesDir, 'javelindata_itemdefinitions_weaponappearances.json'),
  )
  return {
    items,
    appearances,
    weapons,
  }
}

export function fixMtlPath(sourceDir: string, mtlFile: string) {
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

  logger.warn('missing material', mtlFile)
  return null
}

export function fixModelPath(sourceDir: string, modelFile: string) {
  if (!modelFile) {
    return null
  }

  if (fs.existsSync(path.join(sourceDir, modelFile))) {
    return modelFile
  }
  logger.warn('missing model', modelFile)
  return null
}

export async function collectAssets({
  items,
  itemAppearances,
  weaponAppearances,
  sourceRoot,
}: {
  items: ItemDefinitionMaster[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  sourceRoot: string
}) {
  const appearances = toMap(itemAppearances, 'ItemID')
  const weapons = toMap(weaponAppearances, 'WeaponAppearanceID')
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  function addAppearance(item: ItemDefinitionMaster, appearance: ItemAppearanceDefinition, tags: string[]) {
    if (!appearance) {
      return
    }
    addAsset(item, {
      appearance,
      tags,
      model: appearance.Skin1,
      material: appearance.Material1,
    })
  }

  function addAsset(
    item: ItemDefinitionMaster,
    { appearance, tags, model, material }: Omit<ModelAsset, 'items' | 'refId'>,
  ) {
    material = fixMtlPath(sourceRoot, material)
    model = fixModelPath(sourceRoot, model)
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
        tags: tags,
      })
    }
    assets.get(refId).items.push(item)
  }

  for (const item of items) {
    addAppearance(item, appearances.get(item.ArmorAppearanceM), ['male', item.ItemType])
    addAppearance(item, appearances.get(item.ArmorAppearanceF), ['female', item.ItemType])

    const weapon = weapons.get(item.WeaponAppearanceOverride)
    if (weapon) {
      addAppearance(item, appearances.get(weapon.Appearance), ['male', item.ItemType])
      addAppearance(item, appearances.get(weapon.FemaleAppearance), ['female', item.ItemType])
    }
    if (weapon?.MeshOverride) {
      if (path.extname(weapon.MeshOverride) === '.cdf') {
        await readCdf(path.join(sourceRoot, weapon.MeshOverride))
          .then(({ model, material }) => {
            addAsset(item, {
              appearance: weapon,
              model: model,
              material: material,
              tags: ['mesh', item.ItemType],
            })
          })
          .catch(() => {
            logger.warn(`failed to read`, weapon.MeshOverride)
          })
      }
      if (path.extname(weapon.MeshOverride) === '.cgf') {
        const mtlFile: string = await getMaterialFileForSkin(sourceRoot, weapon.MeshOverride).catch(() => {
          logger.warn(`failed to read`, weapon.MeshOverride)
          return null
        })
        if (mtlFile) {
          addAsset(item, {
            appearance: weapon,
            model: weapon.MeshOverride,
            material: mtlFile,
            tags: ['mesh', item.ItemType],
          })
        }
      }
    }
  }

  return Array.from(assets.values())
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
  // TODO: check if model/material pairs are actually unique
  return uniqBy(assets, (it) => it.model.toLowerCase()).map(({ model, material }) => {
    return { model, material }
  })
}

export async function collectMaterials({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    result.add(asset.material)
  }
  return Array.from(result)
}
