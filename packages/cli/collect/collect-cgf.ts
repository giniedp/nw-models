import { replaceExtname } from '../utils/file-utils'
import { AssetCollector } from './collector'

export interface CollectCgfOptions {
  files: string[]
  material: string
  outFile: string
}

export async function collectCgf(collector: AssetCollector, options: CollectCgfOptions) {
  if (options.outFile) {
    await collector.collect({
      animations: [],
      meshes: options.files.map((file) => {
        return {
          model: file,
          material: options.material,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        }
      }),
      outFile: options.outFile,
    })
  } else {
    for (const file of options.files) {
      await collector.collect({
        animations: [],
        meshes: [
          {
            model: file,
            material: options.material,
            ignoreGeometry: false,
            ignoreSkin: false,
            transform: null,
          },
        ],
        outFile: replaceExtname(file, '').toLowerCase(),
      })
    }
  }
}
