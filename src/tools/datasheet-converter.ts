import { logger, spawn } from "../utils"

export interface DatasheetConverterArgs {
  exe?: string
  input: string
  output: string
  format?: 'json' | 'csv'
  threads?: number
  keepStructure?: boolean
  pretty?: boolean
}

export async function datasheetConverter({
  exe,
  input,
  output,
  format,
  threads,
  keepStructure,
  pretty,
}: DatasheetConverterArgs) {
  // https://github.com/new-world-tools/new-world-tools
  const tool = exe || './tools/datasheet-converter.exe'
  const args = [`-input`, input, `-output`, output, `-format`, format || 'json']
  if (threads) {
    args.push(`-threads`, String(threads))
  }
  if (keepStructure) {
    args.push(`-keep-structure`)
  }
  if (pretty) {
    args.push(`-with-indents`)
  }
  await spawn(tool, args, {
    stdio: logger.isVerbose ? 'inherit' : null,
  })
}
