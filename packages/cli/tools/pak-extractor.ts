import { logger, spawn } from "../utils"
import { resolveTool } from "./resolve-tool"

export interface PakExtrakterArgs {
  exe?: string
  input: string
  output: string
  exclude?: string[]
  include?: string[]
  hashFile?: string
  decompressAzcs?: boolean
  fixLua?: boolean
  threads?: number
}
export async function pakExtractor({
  exe,
  input,
  output,
  include,
  exclude,
  hashFile,
  decompressAzcs,
  fixLua,
  threads,
}: PakExtrakterArgs) {
  // https://github.com/new-world-tools/new-world-tools
  const tool = exe || resolveTool('pak-extracter.exe')
  const args = [`-input`, input, `-output`, output]
  if (exclude) {
    args.push(`-exclude`, exclude.map((it) => `(${it})`).join('|'))
  }
  if (include) {
    args.push(`-include`, include.map((it) => `(${it})`).join('|'))
  }
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
    stdio: logger.isVerbose ? 'pipe' : 'ignore',
  })
}
