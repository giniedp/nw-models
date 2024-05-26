import 'colors'
import { program } from 'commander'
import { cpus } from 'os'
import path from 'node:path'

import { GAME_DIR, UNPACK_DIR } from '../env'
import { pakExtractor } from '../tools/pak-extractor'
import { logger, wrapError } from '../utils'

program
  .command('unpack')
  .description('Extracts new world game files')
  .requiredOption('-i, --input [gameDir]', 'Path to the game directory', GAME_DIR)
  .requiredOption('-o, --output [outDir]', 'Path to the unpack directory', UNPACK_DIR)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('unpack', JSON.stringify(options, null, 2))

    const input = options.input
    const output = options.output

    await pakExtractor({
      threads: Math.min(cpus().length, 10),
      input: path.join(input, 'assets'),
      output: output,
      exclude: ['(pregame|server|timelines)[/\\\\]', 'lyshineui[/\\\\].*\\.dynamicslice$', '\\.dynamicuicanvas$'],
      fixLua: true,
      decompressAzcs: true,
    }).catch(wrapError('pak-extractor failed'))
  })
