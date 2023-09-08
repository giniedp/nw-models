import path from 'path'
import { Housingitems } from '../types'
import { AssetCollector } from './asset-collector'
import { collectFromSlice } from './collect-slices'
import { logger } from '../utils/logger'

export async function collectHousingItems(slicesDir: string, items: Housingitems[], collector: AssetCollector) {
  const outDir = 'housingitems'
  logger.debug('collecting housing items', items.length)
  for (const item of items) {
    const sliceFile = path.join(slicesDir, item.PrefabPath) + '.dynamicslice.json'
    logger.debug('reading slice', sliceFile)
    await collectFromSlice({
      slicesDir,
      sliceFile,
      outDir,
      collector,
    })
  }
}
