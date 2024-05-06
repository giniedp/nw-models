import { StdioOptions } from 'child_process'
import { logger, spawn } from '../utils'
import { resolveTool } from './resolve-tool'

export interface ObjectStreamConverterArgs {
  exe?: string
  input: string
  output: string
  threads?: number
  pretty?: boolean
  stdio?: StdioOptions
}
export async function objectStreamConverter({ exe, input, output, threads, pretty, stdio }: ObjectStreamConverterArgs) {
  const tool = exe || resolveTool('object-stream-converter.exe')
  const args = [`-input`, input, `-output`, output]
  if (threads) {
    args.push(`-threads`, String(threads))
  }
  if (pretty) {
    args.push(`-with-indents`)
  }
  await spawn(tool, args, {
    stdio: stdio,
  })
}
