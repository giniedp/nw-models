import { config } from 'dotenv'
import * as path from 'path'

config()

export const GAME_DIR = process.env.NW_GAME_DIR
export const UNPACK_DIR = process.env.NW_UNPACK_DIR || path.join('out', 'assets')
export const MODELS_DIR = process.env.NW_MODELS_DIR || path.join('out', 'models')
export const TABLES_DIR = process.env.NW_TABLES_DIR || path.join('out', 'tables')
export const SLICES_DIR = process.env.NW_SLICES_DIR || path.join('out', 'slices')
export const TRANSIT_DIR = process.env.NW_TRANSIT_DIR || path.join('out', 'transit')
