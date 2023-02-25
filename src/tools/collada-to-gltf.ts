import { logger, spawn } from "../utils"

export interface Collada2GltfArgs {
  exe?: string
  input: string
  output?: string
  materialsCommon?: boolean
  separate?: boolean
  separateTextures?: boolean
  binary?: boolean
}

export async function colladaToGltf({
  exe,
  input,
  output,
  materialsCommon,
  separate,
  separateTextures,
  binary,
}: Collada2GltfArgs) {
  // https://github.com/KhronosGroup/COLLADA2GLTF
  const tool = exe || './tools/COLLADA2GLTF/COLLADA2GLTF-bin.exe'
  const args = [input]

  if (materialsCommon) {
    args.push(`-m`)
  }
  if (separate) {
    args.push(`-s`)
  }
  if (separateTextures) {
    args.push(`-t`)
  }
  if (binary) {
    args.push(`-b`)
  }
  if (output) {
    args.push(output)
  }
  await spawn(tool, args, {
    stdio: logger.isVerbose ? 'inherit' : null,
  })
}
