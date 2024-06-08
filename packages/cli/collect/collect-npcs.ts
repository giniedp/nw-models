import path from 'node:path'
import { resolveCDFAsset } from '../file-formats/cdf'
import { Npc, NpcSchema } from '../types'
import { logger, readJSONFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { AssetCollector } from './collector'

export interface CollectNpcsOptions {
  filter?: (item: Npc) => boolean
}

export async function collectNpcs(collector: AssetCollector, options: CollectNpcsOptions) {
  const table = await Promise.all(
    // prettier-ignore
    [
      'javelindata_variations_npcs.json',
      'javelindata_variations_npcs_walkaway.json'
    ].map((it) =>
      readJSONFile(path.join(collector.tablesDir, it), NpcSchema),
    ),
  ).then((it) => it.flat())

  await withProgressBar({ name: 'Scan NPCs', tasks: table }, async (item) => {
    const modelFile = item.CharacterDefinition
    if (!modelFile || path.extname(modelFile) !== '.cdf') {
      return
    }
    if (options.filter && !options.filter(item as any)) {
      return
    }
    const asset = await resolveCDFAsset(modelFile, {
      inputDir: collector.inputDir,
      animations: false,
    }).catch((err) => {
      logger.error(err)
      logger.warn(`failed to read`, modelFile)
    })
    if (!asset) {
      return
    }

    await collector.collect({
      meshes: asset.meshes.map(({ model, material }) => {
        return {
          model,
          material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      // keep in original folder structure
      outFile: modelFile.toLowerCase(),
    })
  })
}
