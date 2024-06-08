import 'colors'
import { program } from 'commander'
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import mung from 'express-mung'

import { MODELS_DIR } from '../env'

program
  .command('viewer')
  .description('Starts the viewer server')
  .requiredOption('-p, --port [port]', 'Models directory to serve', String(9000))
  .requiredOption('-d, --dir [directory]', 'Models directory to serve', MODELS_DIR)
  .requiredOption('-t, --title <title>', 'Title string', 'Viewer')
  .requiredOption('-vd, --viewerDir [viewerDir]', 'Viewer directory to serve', path.join(__dirname, '../../viewer'))
  .action(async (options) => {
    const app = express()

    const indexHtml = path.join(options.viewerDir, 'index.html')
    const indexData = fs.readFileSync(indexHtml, {
      encoding: 'utf-8',
    })

    app.use(['/', '/index.html'], (req, res, next) => {
      if (req.path === '/' || req.path === '/index.html') {
        res.send(indexData.replace('<title>Viewer</title>', `<title>${options.title}</title>`))
      } else {
        next()
      }
    })
    app.use(express.static(options.dir))
    app.use(express.static(options.viewerDir))
    app.listen(options.port, () => {
      console.log(`Viewer is served at http://localhost:${options.port}`)
    })
  })
