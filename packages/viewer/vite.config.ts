import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'
import {config} from 'dotenv'
config()

const WORKSPACE = path.resolve(__dirname, '../../')
const MODELS_DIR = path.resolve(WORKSPACE, process.env.NW_MODELS_DIR || path.join('out', 'models'))
const OUT_DIR = path.resolve(WORKSPACE, 'dist/viewer')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: OUT_DIR
  }
})
