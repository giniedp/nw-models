import 'colors'
import { program } from 'commander'
import os from 'node:os'
import path from 'node:path'
import { glob, logger } from '../utils'
import { runTasks } from '../worker/runner'

program
  .command('convert-gltf')
  .description('Converts textures of given gltf/glb models into desired format and quality.')
  .requiredOption('-i, --input <inputDir>', 'Input directory')
  .requiredOption('-f, --files <files>', 'File or glob pattern as seen from input dir')
  .requiredOption('-o, --output <outputDir>', 'Output directory for converted files')
  .option('-tf, --texture-format <textureFormat>', 'Output texture format (png, jpeg, webp, ktx).')
  .option('-tq, --texture-quality <textureQuality>', 'Texture conversion quality 0-100')
  .option('-ts, --texture-size <textureSize>', 'Maximum texture size.')
  .option('-tc, --thread-count <threadCount>', 'Number of threads', String(os.cpus().length))
  .option('-se, --skip-existing', 'Skips existing files.', false)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('optimize', JSON.stringify(options, null, 2))

    const cpuCount = os.cpus().length
    const inputDir = options.input
    const patterns = options.files
    const outDir = options.output
    const textureFormat = options.textureFormat
    const textureQuality = options.textureQuality
    const textureSize = options.textureSize
    const skipExisting = options.skipExisting
    const threadCount: number = Number(options.threadCount) || 0
    const verbose = !threadCount
    const files = await glob(path.resolve(inputDir || '', patterns))
    const ktxThreadSize = files.length === 1 || threadCount <= 2  ? cpuCount : 1

    logger.verbose(verbose)

    await runTasks({
      label: 'Convert',
      threads: threadCount,
      taskName: 'processGltf',
      tasks: files.map((input) => {
        const relative = path.relative(inputDir, input)
        const output = path.resolve(outDir, relative)
        return {
          input,
          output,
          textureFormat: textureFormat,
          textureQuality: textureQuality ? parseInt(textureQuality) : undefined,
          textureSize,
          ktxThreadSize,
          skipExisting
        }
      }),
    })
  })
