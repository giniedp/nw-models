import { AssetCollector } from './collector'

export interface CollectCgfOptions {
  files: string[]
}

export async function collectCgf(collector: AssetCollector, options: CollectCgfOptions) {
  for (const file of options.files) {
    await collector.collect({
      animations: [],
      meshes: [
        {
          model: file,
          material: null,
          ignoreGeometry: false,
          ignoreSkin: false,
          transform: null,
        },
      ],
      outFile: file,
    })
  }
}
