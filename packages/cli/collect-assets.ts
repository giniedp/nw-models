import { createHash } from 'crypto'
import * as fs from 'fs'
import { uniqBy } from 'lodash'
import * as path from 'path'
import { getModelsFromCdf } from './file-formats/cdf'
import { loadMtlFile } from './file-formats/mtl'
import { walkJsonObjects } from './tools/walk-json'
import {
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemDefinitionMaster,
  ItemdefinitionsWeapons,
  ModelAsset,
  ModelMeshAsset,
  WeaponAppearanceDefinition,
} from './types'
import { CaseInsensitiveMap, CaseInsensitiveSet, glob, logger, readJsonFile, replaceExtname } from './utils'

export async function readTables({ tablesDir }: { tablesDir: string }) {
  const items = await glob([
    path.join(tablesDir, 'javelindata_itemdefinitions_master_*.json'),
    path.join(tablesDir, 'mtx', 'javelindata_itemdefinitions_*.json')
  ])
    .then((items) => Promise.all(items.map((it) => readJsonFile<ItemDefinitionMaster[]>(it))))
    .then((data) => data.flat(1))
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
    items,
    housingItems,
    itemAppearances,
    weaponAppearances,
    instrumentAppearances,
    weapons,
  }
}

export function fixMtlPath({
  sourceDir,
  mtlFile,
  mtlFileFallback,
  logTag,
}: {
  sourceDir: string
  mtlFile: string
  mtlFileFallback?: string
  logTag: string
}) {
  if (!mtlFile) {
    mtlFile = mtlFileFallback
  }
  if (!mtlFile) {
    return null
  }

  for (const file of [mtlFile, mtlFileFallback]) {
    if (!file) {
      continue
    }
    if (fs.existsSync(path.join(sourceDir, file))) {
      return file
    }
    // materials are sometimes referenced wrongly
    // - objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
    // should be
    // - objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
    const candidate = path.join(path.dirname(file), '..', path.basename(file))
    if (file.includes('textures') && fs.existsSync(path.join(sourceDir, candidate))) {
      return candidate
    }
  }

  logger.warn('missing material', mtlFile, `(${logTag})`)
  return null
}

export function fixModelPath(sourceDir: string, modelFile: string, logTag: string) {
  if (!modelFile) {
    return null
  }
  // HINT: .cloth files are notmodel files
  if (path.extname(modelFile) === '.cloth') {
    const skinFile = replaceExtname(modelFile, '.skin')
    if (fs.existsSync(path.join(sourceDir, skinFile))) {
      return skinFile
    }
    return null
  }

  if (fs.existsSync(path.join(sourceDir, modelFile))) {
    return modelFile
  }
  logger.warn('missing model', modelFile, `(${logTag})`)
  return null
}

type AssetCollector = ReturnType<typeof assetCollector>
function assetCollector({ sourceRoot, extname }: { sourceRoot: string; extname: string }) {
  const assets = new CaseInsensitiveMap<string, ModelAsset>()

  async function addAsset({
    appearance,
    meshes,
    outDir,
    outFile,
    fallbackMaterial,
  }: ModelAsset & { fallbackMaterial?: string }) {
    meshes = meshes
      .map(({ model, material }): ModelMeshAsset => {
        material = fixMtlPath({
          sourceDir: sourceRoot,
          mtlFile: material,
          mtlFileFallback: fallbackMaterial,
          logTag: [outDir, outFile].join(' '),
        })
        model = fixModelPath(sourceRoot, model, [outDir, outFile].join(' '))
        if (!model || !material) {
          return null
        }
        return {
          model: model,
          material: material,
          hash: createHash('md5').update(`${model}-${material}`).digest('hex'),
        }
      })
      .filter((it) => !!it)
    if (!meshes.length) {
      return
    }
    const refId = path.join(outDir, outFile)
    if (assets.has(refId)) {
      logger.warn(`skipped duplicate asset: ${refId}`)
    } else {
      assets.set(refId, {
        appearance: appearance,
        meshes: meshes,
        outDir: outDir,
        outFile: outFile + extname,
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
  slicesRoot,
  extname,
}: {
  housingItems: Housingitems[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  instrumentAppearances: InstrumentAppearance[]
  weapons: ItemdefinitionsWeapons[]
  sourceRoot: string
  slicesRoot: string
  extname?: string
}) {
  const result = assetCollector({
    sourceRoot: sourceRoot,
    extname: extname || '.gltf',
  })
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
    //       60% of the items fail to convert.
    // ===========================================================
    // if (item.AppearanceCDF) {
    //   await getModelsFromCdf(path.join(collector.sourceRoot, item.AppearanceCDF))
    //     .then((models) => {
    //       collector.addAsset({
    //         appearance: item,
    //         // fallback is just for debugging the model, do not use it
    //         // fallbackMaterial: item.Material1 || item.Material2,
    //         meshes: models.map(({ model, material }) => {
    //           return {
    //             model,
    //             material,
    //             hash: null,
    //           }
    //         }),
    //         outDir: outDir,
    //         outFile: [item.ItemID, 'AppearanceCDF'].join('-'),
    //       })
    //     })
    //     .catch(() => {
    //       logger.warn(`failed to read`, item.AppearanceCDF)
    //     })
    // }

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

async function collectWeapons(items: ItemdefinitionsWeapons[], collector: AssetCollector) {
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

async function collectWeaponAppearances(items: WeaponAppearanceDefinition[], collector: AssetCollector) {
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

async function collectInstrumentAppearances(items: InstrumentAppearance[], collector: AssetCollector) {
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

export function matchesAnyInList<T>(idProp: keyof T, list: string[]) {
  if (!list) {
    return (item: T) => true
  }
  return (item: T) => {
    const value = String(item[idProp]).toLowerCase()
    return list.some((it) => value.includes(it))
  }
}

export function isInListFilter<T>(prop: keyof T, list: string[]) {
  if (!list) {
    return () => true
  }
  return (item: T) => {
    const value = String(item[prop])
    return list.some((it) => eqIgnoreCase(it, value))
  }
}

export function filterAssetsBySkinName(skin: string, assets: ModelAsset[]) {
  if (!skin) {
    return assets
  }
  const skins = skin.split(',').map((it) => it.toLowerCase())
  return assets.filter((it) => {
    return it.meshes.some(({ model }) => {
      const skin = model.toLowerCase()
      return skins.some((it) => skin.includes(it))
    })
  })
}

export function filterAssetsModelMaterialHash(hash: string, assets: ModelAsset[]) {
  if (!hash) {
    return assets
  }
  const hashes = hash.split(',').map((it) => it.toLowerCase())
  return assets.filter((it) => {
    return it.meshes.some(({ hash }) => {
      hash = hash.toLowerCase()
      return hashes.some((it) => it === hash)
    })
  })
}

export async function collectTextures({ sourceRoot, assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    for (const mesh of asset.meshes) {
      const mtl = await loadMtlFile(path.join(sourceRoot, mesh.material))
      for (const it of mtl) {
        for (const texture of it.textures) {
          result.add(replaceExtname(texture.File, '.dds'))
        }
      }
    }
  }
  return Array.from(result)
}

export async function collectModels({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  function identity(asset: ModelMeshAsset) {
    if (asset.hash) {
      return asset.hash
    }
    return `${asset.model}:${asset.material}`.toLowerCase()
  }
  const meshes = assets.map((asset) => asset.meshes).flat(1)
  return uniqBy(meshes, identity).map((it) => {
    return {
      ...it,
    }
  })
}

export async function collectMaterials({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    for (const mesh of asset.meshes) {
      result.add(mesh.material)
    }
  }
  return Array.from(result)
}

function eqIgnoreCase(a: string, b: string) {
  return a?.toLowerCase() === b?.toLowerCase()
}