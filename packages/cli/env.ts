import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import * as path from 'path'

expand(config())

function wsEnv(name: string, fallback?: string) {
  const ws = process.env.NW_WORKSPACE
  const wsName = ws ? name + '_' + ws.toUpperCase() : name

  if (wsName && process.env[wsName]) {
    return process.env[wsName]
  }
  if (fallback !== undefined) {
    return fallback
  }
  throw new Error(`env variable '${wsName}' is not defined `)
}

export const GAME_DIR = wsEnv('NW_GAME_DIR')
export const UNPACK_DIR = wsEnv('NW_UNPACK_DIR', path.join('out', 'unpack'))
export const CONVERT_DIR = wsEnv('NW_CONVERT_DIR', path.join('out', 'convert'))
export const MODELS_DIR = wsEnv('NW_MODELS_DIR', path.join('out', 'models'))
