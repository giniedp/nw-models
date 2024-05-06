import path from 'path'
import { getCDFAnimationFiles, getCDFSkinsOrCloth, readCDF } from '../file-formats/cdf'
import { logger } from '../utils/logger'
import { AssetCollector } from './asset-collector'

export async function collectCDFAsset(file: string, collector: AssetCollector, outDir = 'files') {
  return Promise.resolve((async () => {
    file = collector.inputFS.absolute(file)
    const inputDir = collector.inputFS.rootDir
    const cdf = await readCDF(file)
    const cafFiles = await getCDFAnimationFiles(cdf, inputDir)
    const skins = getCDFSkinsOrCloth(cdf)

    collector.addAsset({
      animations: cafFiles,
      meshes: skins.map(({ model, material }, i) => {
        return {
          model,
          material,
          hash: null,
          ignoreSkin: i > 0
        }
      }),
      outDir: outDir,
      outFile: path.relative(inputDir, file),
    })
  })()).catch((err) => {
    logger.error(err)
    logger.warn(`failed to read`, file)
  })
}

export async function collectCDF(items: string[], collector: AssetCollector, outDir = 'files') {
  for (const file of items) {
    if (path.extname(file) === '.cdf') {
      await collectCDFAsset(file, collector, outDir)
    }
  }
}
