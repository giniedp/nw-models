import {
  CostumeChanges,
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemdefinitionsWeapons,
  Mounts,
  Npc,
  WeaponAppearanceDefinition,
} from '../types'
import { assetCollector } from './asset-collector'
import { collectCDF } from './collect-cdf'
import { collectCostumeChanges } from './collect-costumechanges'
import { collectHousingItems } from './collect-housing-items'
import { collectInstrumentAppearances } from './collect-instrument-appearances'
import { collectItemAppearances } from './collect-item-appearances'
import { collectMounts } from './collect-mounts'
import { collectNpcs } from './collect-npcs'
import { collectSlices } from './collect-slices'
import { collectWeaponAppearances } from './collect-weapon-appearances'
import { collectWeapons } from './collect-weapons'

export async function collectAssets({
  mounts,
  costumeChanges,
  housingItems,
  itemAppearances,
  weaponAppearances,
  instrumentAppearances,
  npcs,
  weapons,
  sourceRoot,
  slicesRoot,
  modelFormat,
  slices,
  models,
}: {
  mounts: Mounts[]
  costumeChanges: CostumeChanges[]
  housingItems: Housingitems[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  instrumentAppearances: InstrumentAppearance[]
  weapons: ItemdefinitionsWeapons[]
  npcs: Npc[]
  sourceRoot: string
  slicesRoot: string
  modelFormat?: 'gltf' | 'glb'
  slices?: string[]
  models?: string[]
}) {
  const result = assetCollector({
    inputDir: sourceRoot,
    modelFormat: modelFormat || 'gltf',
  })
  await collectMounts(mounts, result)
  await collectCostumeChanges(costumeChanges, result)
  await collectItemAppearances(itemAppearances, result)
  await collectWeaponAppearances(weaponAppearances, result)
  await collectInstrumentAppearances(instrumentAppearances, result)
  await collectHousingItems(slicesRoot, housingItems, result)
  await collectWeapons(weapons, result)
  await collectSlices(slicesRoot, slices, result)
  await collectCDF(models, result)
  await collectNpcs(npcs, result)
  return Array.from(result.values())
}
