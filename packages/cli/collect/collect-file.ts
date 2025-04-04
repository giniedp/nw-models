import path from 'node:path'
import { z } from 'zod'
import { adbActionsForTags, readAdbFile } from '../file-formats/adb'
import { resolveCDFAsset } from '../file-formats/cdf'
import { DEFAULT_MATERIAL } from '../file-formats/resolvers'
import { ModelAnimation } from '../types'
import { logger, readJSONFile, replaceExtname } from '../utils'
import { withProgressBar } from '../utils/progress'
import { collectAnimations } from './collect-animations'
import { AssetCollector } from './collector'

export interface CollectFile {
  file: string
  convertDir: string
  filter?: (item: { id: string }) => boolean
}

export async function collectFile(collector: AssetCollector, options: CollectFile) {
  const table = await readJSONFile(
    options.file,
    z.array(
      z.object({
        id: z.string(),
        cdf: z.string(),
        mtl: z.optional(z.string()),
        adb: z.optional(z.string()),
        dmg: z.optional(z.string()),
      }),
    ),
  )

  await withProgressBar({ name: 'Collecting files', tasks: table }, async (item) => {
    const modelFile = path.resolve(collector.inputDir, item.cdf)
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

    let animations: ModelAnimation[] = []
    if (item.adb) {
      const adb = await readAdbFile(path.resolve(collector.inputDir, item.adb))
      animations = await collectAnimations({
        animations: asset.animations,
        actions: adbActionsForTags(adb),
        filter: ({ damageIds, actions }) => {
          // if (damageIds?.length) {
          //   return true
          // }
          return actions.some((it) => {
            if (it.toLowerCase().startsWith('idle')) {
              return true
            }
            // if (it.toLowerCase().startsWith('combat_idle')) {
            //   return true
            // }
            return false
          })
        },
      })
    }
    if (item.dmg) {
      const dmgFile = replaceExtname(path.resolve(options.convertDir, item.dmg), '.json')
      const dmgTable = await readJSONFile(
        dmgFile,
        z.array(
          z.object({
            DamageID: z.string(),
          }),
        ),
      )
      const dmgNames = dmgTable.map((it) => it.DamageID.toLowerCase())
      animations = animations.filter((it) => {
        if (!it.damageIds.length) {
          return true
        }
        return it.damageIds.some((it) => dmgNames.includes(it.toLowerCase()))
      })
    }

    await collector.collect({
      animations: animations,
      meshes: [
        {
          model: asset.model,
          material: DEFAULT_MATERIAL,
          ignoreGeometry: true,
          ignoreSkin: false,
          transform: null,
        },
        ...asset.meshes.map(({ model, material }) => {
          return {
            model,
            material: item.mtl || material,
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          }
        }),
      ],
      outFile: path.join('vitals', item.id),
    })
  })
}
