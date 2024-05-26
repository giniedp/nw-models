import path from 'node:path'
import { adbActionsForTags, readAdbFile } from '../file-formats/adb'
import { resolveCDFAsset } from '../file-formats/cdf'
import { ModelAnimation, Mounts, MountsTableSchema } from '../types'
import { logger, readJSONFile } from '../utils'
import { collectAnimations } from './collect-animations'
import { AssetCollector } from './collector'

export interface CollectMountsOptions {
  filter?: (item: Mounts) => boolean
}

const ADB_MAP: Record<string, string> = {
  Horse: 'animations/mannequin/adb/mounts/mount_horse_anims.adb',
  Sabretooth: 'animations/mannequin/adb/mounts/mount_cat_anims.adb',
  DireWolf: 'animations/mannequin/adb/mounts/mount_wolf_anims.adb',
}

export async function collectMounts(collector: AssetCollector, options: CollectMountsOptions) {
  const table = await readJSONFile(
    path.join(collector.tablesDir, 'mounts', 'javelindata_mounts.json'),
    MountsTableSchema,
  )
  for (const item of table) {
    const modelFile = item.Mesh
    if (!modelFile || path.extname(modelFile) !== '.cdf') {
      continue
    }
    if (options.filter && !options.filter(item as any)) {
      continue
    }
    const asset = await resolveCDFAsset(modelFile, { inputDir: collector.inputDir }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, modelFile)
    })
    if (!asset) {
      continue
    }

    const adbFile = ADB_MAP[item.MountType]
    let animations: ModelAnimation[] = []
    if (adbFile) {
      const adb = await readAdbFile(path.resolve(collector.inputDir, adbFile))
      animations = await collectAnimations({
        actions: adbActionsForTags(adb),
        animations: asset.animations,
      })
    }

    await collector.collect({
      animations: animations,
      meshes: asset.meshes.map(({ model, material }) => {
        return {
          model,
          material: item.Material || material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      outFile: path.join('mounts', item.MountId).toLowerCase(),
    })
  }
}
