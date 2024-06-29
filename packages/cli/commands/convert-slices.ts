import 'colors'
import { program } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { cpus } from 'os'
import { CONVERT_DIR, UNPACK_DIR } from '../env'
import { objectStreamConverter } from '../tools/object-stream-converter'
import { glob, logger, mkdir, wrapError } from '../utils'
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

    await copyCommonFiles(inputDir, outputDir)
    await convertObjectStreams({ inputDir, outputDir })
  })

async function copyCommonFiles(inputDir: string, outputDir: string) {
  const files = await glob(path.join(inputDir, '**', '*.json'))
  await withProgressBar({ name: 'Copy JSON', tasks: files }, async (file, i, log) => {
    const relPath = path.relative(inputDir, file)
    const outPath = path.join(outputDir, relPath)
    log(relPath)
    await mkdir(path.dirname(outPath), { recursive: true })
    await fs.promises.copyFile(file, outPath)
  })
}

async function convertObjectStreams({ inputDir, outputDir }: { inputDir: string; outputDir: string }) {
  await withProgressBar(
    { name: 'Object Streams', tasks: ['libs', 'coatgen', 'sharedassets', 'slices'] },
    async (dir, i, log) => {
      log(dir)
      await objectStreamConverter({
        input: path.join(inputDir, dir),
        output: path.join(outputDir, dir),
        pretty: true,
        threads: Math.min(cpus().length, 10),
        stdio: 'pipe',
      }).catch(wrapError('object-stream-converter failed'))
    },
  )
}
