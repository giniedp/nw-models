import path from 'node:path'
import { adbActionsForTags, readAdbFile } from '../file-formats/adb'
import { resolveCDFAsset } from '../file-formats/cdf'
import { ModelAnimation, Mounts, MountsTableSchema } from '../types'
import { logger, readJSONFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { collectAnimations } from './collect-animations'
import { AssetCollector } from './collector'

export interface CollectMountsOptions {
  filter?: (item: Mounts) => boolean
}

const ADB_MAP: Record<string, string> = {
  Horse: 'animations/mannequin/adb/mounts/mount_horse_anims.adb',
  Sabretooth: 'animations/mannequin/adb/mounts/mount_cat_anims.adb',
  DireWolf: 'animations/mannequin/adb/mounts/mount_wolf_anims.adb',
  Bear: 'animations/mannequin/adb/mounts/mount_bear_anims.adb',
}

export async function collectMounts(collector: AssetCollector, options: CollectMountsOptions) {
  const table = await readJSONFile(
    path.join(collector.tablesDir, 'mounts', 'javelindata_mounts.json'),
    MountsTableSchema,
  )
  await withProgressBar({ name: 'Scan Mounts', tasks: table }, async (item) => {
    const modelFile = item.Mesh
    if (!modelFile || path.extname(modelFile) !== '.cdf') {
      return
    }
    if (options.filter && !options.filter(item as any)) {
      return
    }
    const asset = await resolveCDFAsset(modelFile, {
      inputDir: collector.inputDir,
      animations: true,
    }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, modelFile)
    })
    if (!asset) {
      return
    }

    const adbFile = ADB_MAP[item.MountType]
    let animations: ModelAnimation[] = []
    const keepActions = ['Idle']

    if (adbFile) {
      const adb = await readAdbFile(path.resolve(collector.inputDir, adbFile))
      animations = await collectAnimations({
        actions: adbActionsForTags(adb),
        animations: asset.animations,
        filter: ({ actions }) => {
          if (!keepActions?.length) {
            return true
          }
          return keepActions.some((pattern) => {
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
              return actions.some((a) => regex.test(a))
            }
            return actions.some((a) => a.toLowerCase() === pattern.toLocaleLowerCase())
          })
        },
      })
    } else {
      logger.warn(`No ADB file found for mount type ${item.MountType}`)
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
  })
}
