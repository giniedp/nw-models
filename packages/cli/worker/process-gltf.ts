import fs from 'node:fs'
import { ConvertGltfOptions, convertGltf } from '../file-formats/gltf'

export type ProcessGltfOptions = ConvertGltfOptions & {
  skipExisting?: boolean
}

export async function processGltf(options: ProcessGltfOptions ) {
  if (options.skipExisting && fs.existsSync(options.output)) {
    return
  }
  await convertGltf(options)
}
