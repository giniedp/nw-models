import 'colors'
import { program } from 'commander'
import path from 'node:path'

import { CONVERT_DIR, UNPACK_DIR } from '../env'
import { objectStreamConverter } from '../tools/object-stream-converter'
import { logger, wrapError } from '../utils'
import { withProgressBar } from '../utils/progress'

program
  .command('convert-slices')
  .description('Converts slices to JSON format')
  .requiredOption('-i, --input [dataDir]', 'Path to the unpacked game data directory', UNPACK_DIR)
  .requiredOption('-o, --output [outDir]', 'Path to the converted game data directory', CONVERT_DIR)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('convert-slices', JSON.stringify(options, null, 2))

    const inputDir = options.input
    const outputDir = options.output

    await withProgressBar({ tasks: ['slices'] }, async (dir, i, log) => {
      log(dir)
      await objectStreamConverter({
        input: path.join(inputDir, dir),
        output: path.join(outputDir, dir),
        pretty: true,
        threads: Math.min(options.threads, 10),
        stdio: null
      })
    }).catch(wrapError('object-stream-converter failed'))
  })
