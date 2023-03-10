import { logger, spawn } from "../utils"

export interface PakExtrakterArgs {
  exe?: string
  assets: string
  output: string
  hashFile?: string
  decompressAzcs?: boolean
  fixLua?: boolean
  threads?: number
}
export async function pakExtractor({
  exe,
  assets,
  output,
  hashFile,
  decompressAzcs,
  fixLua,
  threads,
}: PakExtrakterArgs) {
  // https://github.com/new-world-tools/new-world-tools
  const tool = exe || './tools/pak-extracter.exe'
  const args = [`-assets`, assets, `-output`, output]
  if (hashFile) {
    args.push(`-hash`, hashFile)
  }
  if (decompressAzcs) {
    args.push(`-decompress-azcs`)
  }
  if (fixLua) {
    args.push(`-fix-luac`)
  }
  if (threads) {
    args.push(`-threads`, String(threads))
  }
  await spawn(tool, args, {
    stdio: logger.isVerbose ? 'inherit' : null,
  })
}
