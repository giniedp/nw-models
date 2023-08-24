import { logger, spawn } from "../utils"

export interface CgfConverterArgs {
  exe?: string
  input: string
  material?: string
  dataDir?: string
  outDir?: string
  logLevel?: number
  png?: boolean
}

export async function cgfConverter({ exe, input, material, dataDir, outDir, logLevel, png }: CgfConverterArgs) {
  // https://github.com/Markemp/Cryengine-Converter
  const tool = exe || './tools/cgf-converter.exe'

  const args = ['-infile', input]
  if (material) {
    args.push(`-mtl`, material)
  }
  if (dataDir) {
    args.push(`-datadir`, dataDir)
  }
  if (outDir) {
    args.push(`-outdir`, outDir)
  }
  if (logLevel != null) {
    args.push(`-logLevel`, String(logLevel))
  }
  if (png) {
    args.push(`-png`)
  }

  await spawn(tool, args, {
    stdio: logger.isVerbose ? 'inherit' : null,
  })
}
