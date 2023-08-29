import { createHash } from 'crypto'
import * as fs from 'fs'
import { uniqBy } from 'lodash'
import * as path from 'path'
import { readCdf } from './file-formats/cdf'
import { loadMtlFile } from './file-formats/mtl'
import { walkJsonObjects } from './tools/walk-json'
import {
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemDefinitionMaster,
  ItemdefinitionsWeapons,
  ModelAsset,
  WeaponAppearanceDefinition,
} from './types'
import { CaseInsensitiveMap, CaseInsensitiveSet, logger, readJsonFile, replaceExtname } from './utils'

export async function readTables({ tablesDir }: { tablesDir: string }) {
  const housingItems = [
    ...(await readJsonFile<Housingitems[]>(path.join(tablesDir, 'javelindata_housingitems.json'))),
    ...(await readJsonFile<Housingitems[]>(path.join(tablesDir, 'mtx', 'javelindata_housingitems_mtx.json'))),
  ]
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
    housingItems,
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
  // - objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
  // should be
  // - objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
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

type AssetCollector = ReturnType<typeof assetCollector>
function assetCollector(sourceRoot: string) {
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset({ appearance, model, material, outDir, outFile }: Omit<ModelAsset, 'modelMaterialHash'>) {
    material = fixMtlPath(sourceRoot, material, [outDir, outFile].join(' '))
    model = fixModelPath(sourceRoot, model, [outDir, outFile].join(' '))
    if (!model || !material) {
      return
    }
    const refId = path.join(outDir, outFile)
    if (assets.has(refId)) {
      logger.warn(`skipped duplicate asset: ${refId}`)
    } else {
      assets.set(refId, {
        model: model,
        material: material,
        appearance: appearance,
        modelMaterialHash: createHash('md5').update(`${model}-${material}`).digest('hex'),
        outDir: outDir,
        outFile: outFile + '.gltf',
      })
    }
  }
  return {
    sourceRoot: sourceRoot,
    values: () => assets.values(),
    addAsset,
  }
}

export async function collectAssets({
  housingItems,
  itemAppearances,
  weaponAppearances,
  instrumentAppearances,
  weapons,
  sourceRoot,
  slicesRoot
}: {
  housingItems: Housingitems[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  instrumentAppearances: InstrumentAppearance[]
  weapons: ItemdefinitionsWeapons[]
  sourceRoot: string
  slicesRoot: string
}) {
  const result = assetCollector(sourceRoot)
  // await collectHousingItems(slicesRoot, housingItems, result)
  await collectItemAppearances(itemAppearances, result)
  await collectWeaponAppearances(weaponAppearances, result)
  await collectInstrumentAppearances(instrumentAppearances, result)
  await collectWeapons(weapons, result)
  return Array.from(result.values())
}

async function collectItemAppearances(items: ItemAppearanceDefinition[], collector: AssetCollector) {
  const outDir = 'itemappearances'
  for (const item of items) {
    await collector.addAsset({
      appearance: item,
      model: item.Skin1,
      material: item.Material1,
      outDir: outDir,
      outFile: [item.ItemID, 'Skin1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      model: item.Skin2,
      material: item.Material2,
      outDir: outDir,
      outFile: [item.ItemID, 'Skin2'].join('-'),
    })
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
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.AppearanceCDF,
    //   material: item.Material1 || item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'AppearanceCDF'].join('-'),
    // })
  }
}

async function collectWeapons(items: ItemdefinitionsWeapons[], collector: AssetCollector) {
  const outDir = 'weapons'
  for (const item of items) {
    await collector.addAsset({
      appearance: null,
      model: item.SkinOverride1,
      material: item.MaterialOverride1,
      outDir: outDir,
      outFile: [item.WeaponID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: null,
      model: item.SkinOverride2,
      material: item.MaterialOverride1,
      outDir: outDir,
      outFile: [item.WeaponID, 'SkinOverride2'].join('-'),
    })
  }
}

async function collectWeaponAppearances(items: WeaponAppearanceDefinition[], collector: AssetCollector) {
  for (const item of items) {
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride1,
      material: item.MaterialOverride1,
      outDir: 'weaponappearances',
      outFile: [item.WeaponAppearanceID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride2,
      material: item.MaterialOverride1, // HINT: this is a guess, there is no `MaterialOverride2`
      outDir: 'weaponappearances',
      outFile: [item.WeaponAppearanceID, 'SkinOverride2'].join('-'),
    })
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cdf') {
      await readCdf(path.join(collector.sourceRoot, item.MeshOverride))
        .then(({ model, material }) => {
          return collector.addAsset({
            appearance: item,
            model: model,
            material: material,
            outDir: 'weaponappearances',
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
        model: item.MeshOverride,
        material: item.MaterialOverride1,
        outDir: 'weaponappearances',
        outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
      })
    }
  }
}

async function collectInstrumentAppearances(items: InstrumentAppearance[], collector: AssetCollector) {
  const outDir = 'instrumentappearances'
  for (const item of items) {
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride1,
      material: item.MaterialOverride1,
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride1'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride2,
      material: item.MaterialOverride2,
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride2'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride3,
      material: item.MaterialOverride3,
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride3'].join('-'),
    })
    await collector.addAsset({
      appearance: item,
      model: item.SkinOverride4,
      material: item.MaterialOverride4,
      outDir: outDir,
      outFile: [item.WeaponAppearanceID, 'SkinOverride4'].join('-'),
    })
    if (item.MeshOverride && path.extname(item.MeshOverride) === '.cdf') {
      await readCdf(path.join(collector.sourceRoot, item.MeshOverride))
        .then(({ model, material }) => {
          return collector.addAsset({
            appearance: item,
            model: model,
            material: material,
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
        model: item.MeshOverride,
        material: item.MaterialOverride1,
        outDir: 'instrumentappearances',
        outFile: [item.WeaponAppearanceID, 'MeshOverride'].join('-'),
      })
    }
  }
}

async function collectHousingItems(slicesDir: string, items: Housingitems[], collector: AssetCollector) {
  const outDir = 'housingitems'
  for (const item of items) {
    const sliceFile = path.join(slicesDir, item.PrefabPath) + '.dynamicslice.json'
    if (!fs.existsSync(sliceFile)) {
      logger.warn('missing slice', sliceFile)
      continue
    }
    const sliceJSON = readJsonFile(sliceFile)
    walkJsonObjects(sliceJSON, (obj) => {
      const node = obj['static mesh render node']
      if (!node) {
        return false
      }
      const mesh = node['static mesh']
      const mtl = node['material override']
    })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.Skin1,
    //   material: item.Material1,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'Skin1'].join('-'),
    // })
    // await collector.addAsset({
    //   appearance: item,
    //   model: item.Skin2,
    //   material: item.Material2,
    //   outDir: outDir,
    //   outFile: [item.ItemID, 'Skin2'].join('-'),
    // })
  }
}

export function byIdFilter<T>(idProp: keyof T, id: string) {
  if (!id) {
    return (item: T) => true
  }
  const ids = id.split(',').map((it) => it.toLowerCase())
  return (item: T) => {
    const itemId = String(item[idProp]).toLowerCase()
    return ids.some((id) => itemId.includes(id))
  }
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
