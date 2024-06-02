import 'colors'
import { program } from 'commander'

import fs from 'node:fs'
import path from 'node:path'
import { glob, logger, replaceExtname, spawn } from '../utils'

program
  .command('ktx')
  .description('Processes model files and converts textures to KTX format')
  .requiredOption('-f, --file <fileOrGlob>', 'Files to be converted')
  .option('-r --replace', 'Replace original files with converted ones', false)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('ktx', JSON.stringify(options, null, 2))

    const replace = !!options.replace
    const files = await glob(options.file)
    for (const file of files) {
      const outUastc = replaceExtname(file, '.uastc' + path.extname(file))
      await spawn(
        'gltf-transform',
        // prettier-ignore
        [
          'uastc',
          file,
          outUastc,
          '--slots', '{normalTexture,metallicRoughnessTexture}',
          '--level', '4',
          '--rdo',
          '--rdo-lambda', '4',
          '--zstd', '18',
          '--verbose',
        ],
      )
      const outEtc1s = replaceExtname(file, '.etc1s' + path.extname(file))
      await spawn(
        'gltf-transform',
        // prettier-ignore
        [
          'uastc',
          'etc1s',
          outUastc,
          replace ? file : outEtc1s,
          '--quality', '255',
          '--verbose',
        ],
      )

      fs.promises.rm(outUastc)
    }
  })
