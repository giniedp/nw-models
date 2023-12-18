import path from 'path'
import { getModelsFromCdf } from '../file-formats/cdf'
import { Npc } from '../types'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectNpcs(items: Npc[], collector: AssetCollector) {
  const outDir = 'npcs'
  for (const item of items) {
    if (item.CharacterDefinition && path.extname(item.CharacterDefinition) === '.cdf') {
      await getModelsFromCdf(collector.gfs.absolute(item.CharacterDefinition))
        .then((meshes) => {
          return collector.addAsset({
            meshes: meshes.map(({ model, material }) => {
              return {
                model,
                material: material,
                hash: null,
              }
            }),
            outDir: outDir,
            outFile: [item.VariantID, 'CharacterDefinition'].join('-'),
          })
        })
        .catch(() => {
          logger.warn(`failed to read`, item.CharacterDefinition)
        })
    }
  }
}
