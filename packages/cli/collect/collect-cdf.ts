import path from 'node:path'
import { ModelAnimation } from 'types'
import { adbActionsForTags, readAdbFile } from '../file-formats/adb'
import { resolveCDFAsset } from '../file-formats/cdf'
import { logger, replaceExtname } from '../utils'
import { collectAnimations } from './collect-animations'
import { AssetCollector } from './collector'

export interface CollectCdfOptions {
  files: string[]
  adbFile: string
  actions: string[]
  tags: string[]
}

export async function collectCdf(collector: AssetCollector, options: CollectCdfOptions) {
  for (const file of options.files) {
    const asset = await resolveCDFAsset(file, { inputDir: collector.inputDir }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, file)
    })
    if (!asset) {
      continue
    }

    let animations: ModelAnimation[] = []
    if (options.adbFile) {
      const adb = await readAdbFile(path.resolve(collector.inputDir, options.adbFile))
      animations = await collectAnimations({
        animations: asset.animations,
        actions: adbActionsForTags(adb, options.tags || []),
        filter: ({ actions }) => {
          if (!options.actions?.length) {
            return true
          }
          return options.actions.some((pattern) => {
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
              return actions.some((a) => regex.test(a))
            }
            return actions.some((a) => a.toLowerCase() === pattern.toLocaleLowerCase())
          })
        },
      })
    }

    await collector.collect({
      animations: animations,
      meshes: asset.meshes.map(({ model, material }) => {
        return {
          model,
          material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      outFile: replaceExtname(file, '').toLowerCase(),
    })
  }
}
