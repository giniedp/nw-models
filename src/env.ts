import { config } from 'dotenv'
import * as path from 'path'

config()

export const GAME_DIR = process.env.NW_GAME_DIR
export const UNPACK_DIR = process.env.NW_UNPACK_DIR || path.join('out', 'assets')
export const MODELS_DIR = process.env.NW_MODELS_DIR || path.join('out', 'models')
