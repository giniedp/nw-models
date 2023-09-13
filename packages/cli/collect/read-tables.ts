import path from 'path'
import { glob, readJsonFile } from '../utils/file-utils'
import {
  CostumeChanges,
  Housingitems,
  InstrumentAppearance,
  ItemAppearanceDefinition,
  ItemDefinitionMaster,
  ItemdefinitionsWeapons,
  Mounts,
  WeaponAppearanceDefinition,
} from '../types'

export async function readTables({ tablesDir }: { tablesDir: string }) {
  const items = await glob([
    path.join(tablesDir, 'javelindata_itemdefinitions_master_*.json'),
    path.join(tablesDir, 'mtx', 'javelindata_itemdefinitions_*.json'),
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
  const mounts = await readJsonFile<Mounts[]>(path.join(tablesDir, 'mounts', 'javelindata_mounts.json'))
  const costumeChanges = await readJsonFile<CostumeChanges[]>(
    path.join(tablesDir, 'costumechanges', 'javelindata_costumechanges.json'),
  )
  return {
    mounts,
    costumeChanges,
    items,
    housingItems,
    itemAppearances,
    weaponAppearances,
    instrumentAppearances,
    weapons,
  }
}
