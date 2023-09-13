import {
  CostumeChanges,
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemdefinitionsWeapons,
  Mounts,
  WeaponAppearanceDefinition,
} from '../types'
import { assetCollector } from './asset-collector'
import { collectHousingItems } from './collect-housing-items'
import { collectInstrumentAppearances } from './collect-instrument-appearances'
import { collectItemAppearances } from './collect-item-appearances'
import { collectWeaponAppearances } from './collect-weapon-appearances'
import { collectWeapons } from './collect-weapons'
import { collectSlices } from './collect-slices'
import { collectMounts } from './collect-mounts'
import { collectCostumeChanges } from './collect-costumechanges'

export async function collectAssets({
  mounts,
  costumeChanges,
  housingItems,
  itemAppearances,
  weaponAppearances,
  instrumentAppearances,
  weapons,
  sourceRoot,
  slicesRoot,
  extname,
  slices,
}: {
  mounts: Mounts[]
  costumeChanges: CostumeChanges[]
  housingItems: Housingitems[]
  itemAppearances: ItemAppearanceDefinition[]
  weaponAppearances: WeaponAppearanceDefinition[]
  instrumentAppearances: InstrumentAppearance[]
  weapons: ItemdefinitionsWeapons[]
  sourceRoot: string
  slicesRoot: string
  extname?: string
  slices?: string[]
}) {
  const result = assetCollector({
    sourceRoot: sourceRoot,
    extname: extname || '.gltf',
  })
  await collectMounts(mounts, result)
  await collectCostumeChanges(costumeChanges, result)
  await collectItemAppearances(itemAppearances, result)
  await collectWeaponAppearances(weaponAppearances, result)
  await collectInstrumentAppearances(instrumentAppearances, result)
  await collectHousingItems(slicesRoot, housingItems, result)
  await collectWeapons(weapons, result)
  await collectSlices(slicesRoot, slices, result)
  return Array.from(result.values())
}
