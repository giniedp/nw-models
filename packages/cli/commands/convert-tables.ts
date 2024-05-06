import 'colors'
import { program } from 'commander'
import { cpus } from 'os'
import * as path from 'path'

import { CONVERT_DIR, UNPACK_DIR } from '../env'
import { datasheetConverter } from '../tools/datasheet-converter'
import { logger, wrapError } from '../utils'

program
  .command('convert-tables')
  .description('Converts data tables to JSON format')
  .requiredOption(
    '-i, --input [dataDir]',
    'Path to the unpacked game data directory',
    path.join(UNPACK_DIR, 'sharedassets/springboardentitites/datatables'),
  )
  .requiredOption(
    '-o, --output [outDir]',
    'Path to the tables directory',
    path.join(CONVERT_DIR, 'sharedassets/springboardentitites/datatables'),
  )
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('convert-tables', JSON.stringify(options, null, 2))

    const input = options.input
    const output = options.output

    await datasheetConverter({
      threads: Math.min(cpus().length, 10),
      input: input,
      output: output,
      format: 'json',
      keepStructure: true,
      pretty: true,
      stdio: 'inherit'
    }).catch(wrapError('datasheet-converter failed'))
  })
