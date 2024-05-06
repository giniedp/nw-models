import { logger, spawn } from "../utils"
import { resolveTool } from "./resolve-tool"

export interface AssetCatalogParserArgs {
  exe?: string
  input: string
  output: string
}

export async function assetCatalogParser({
  exe,
  input,
  output,
}: AssetCatalogParserArgs) {
  // https://github.com/new-world-tools/new-world-tools
  const tool = exe || resolveTool('asset-catalog-parser.exe')
  const args = [`-input`, input, `-asset-info-output`, output]

  await spawn(tool, args, {
    stdio: logger.isVerbose ? 'inherit' : null,
  })
}
