import {
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemdefinitionsWeapons,
  WeaponAppearanceDefinition,
} from '../types'
import { assetCollector } from './asset-collector'
import { collectHousingItems } from './collect-housing-items'
import { collectInstrumentAppearances } from './collect-instrument-appearances'
import { collectItemAppearances } from './collect-item-appearances'
import { collectWeaponAppearances } from './collect-weapon-appearances'
import { collectWeapons } from './collect-weapons'
import { collectSlices } from './collect-slices'

export async function collectAssets({
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
  await collectItemAppearances(itemAppearances, result)
  await collectWeaponAppearances(weaponAppearances, result)
  await collectInstrumentAppearances(instrumentAppearances, result)
  await collectHousingItems(slicesRoot, housingItems, result)
  await collectWeapons(weapons, result)
  await collectSlices(slicesRoot, slices, result)
  return Array.from(result.values())
}
