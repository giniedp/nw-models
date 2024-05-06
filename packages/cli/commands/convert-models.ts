import 'colors'
import { program } from 'commander'
import * as fs from 'fs'
import { cpus } from 'os'
import * as path from 'path'

import { assetCollector } from 'collect/asset-collector'
import { collectCDFAsset } from 'collect/collect-cdf'
import { selectMaterials, selectModels, selectTextures } from '../collect'
import { CONVERT_DIR, MODELS_DIR, UNPACK_DIR } from '../env'
import { ModelAsset } from '../types'
import { logger, writeFile } from '../utils'
import { runTasks } from '../worker'

program
  .command('convert-models')
  .description('Converts models to GLTF file format')
  .requiredOption('-i, --unpackDir [unpackDir]', 'Path to the unpacked game directory', UNPACK_DIR)
  .requiredOption('-x, --transitDir [transitDir]', 'Path to the intermediate directory', CONVERT_DIR)
  .requiredOption('-o, --outputDir [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option('--update', 'Ignores previously converted and exported data and overrides files')
  .option('--thread-count <threadCount>', 'Number of threads', String(cpus().length))
  .option('--texture-size <textureSize>', 'Resize all textures to given size.')
  .option('--draco', 'Enables Draco compression', false)
  .option('--webp', 'Converts textures to wepb instead of png before embedding into model', false)
  .option('--ktx', 'Compresses textures to ktx instead of png before embedding into model', false)
  .option('--glb', 'Exports binary GLTF .glb files instead of .gltf JSON', false)
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')

  .option('-id, --id <id>', 'Filter by object identifier (may be substring, comma separated)')
  .option('-iid, --itemId <itemId>', 'Prefilter by ItemID (may be substring, comma separated)')
  .option('-hash, --hash <md5Hash>', 'Filter by md5 hash (must be exact, comma separated)')
  .option('-skin, --skin <skinFile>', 'Filter by skin file name (may be substring, comma separated)')
  .option('-at, --asset-type <assetType>', 'Filter by asset type. (must be exact, comma separated)')
  .option('-slice, --slice <sliceFile>', 'Forcefully convert a single slice file')
  .option('-cdf, --cdf <cdfFile>', 'Forcefully convert a single .cdf file')
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', opts)

    const threads: number = Number(opts.threadCount) || 0
    const options: ConvertModelsOptions = {
      inputDir: opts.unpackDir,
      transitDir: opts.transitDir,
      outputDir: opts.outputDir,

      textureSize: Number(opts.textureSize) || null,
      binary: !!opts.glb,
      draco: !!opts.draco,
      webp: !!opts.webp,
      ktx: !!opts.ktx,

      verbose: opts.verbose ?? !threads,
      threadCount: threads,
      update: opts.update,

      assets: [],
    }

    const collector = assetCollector({
      inputDir: options.inputDir,
      modelFormat: options.binary ? 'glb' : 'gltf',
    })

    const modelFiles = await collector.inputFS.glob([
      //'objects/characters/npc/**/*.cdf'
      //'objects/characters/npc/natural/adiana/adiana.cdf'
      'objects/characters/npc/supernatural/sandworm/sandworm.cdf',
      'objects/characters/npc/supernatural/apophis/apophis.cdf'
    ])

    for (const modelFile of modelFiles) {
      await collectCDFAsset(modelFile, collector, '')
    }

    options.assets = collector.values()

    await convertModels(options)
  })

interface ConvertModelsOptions {
  inputDir: string
  transitDir: string
  outputDir: string
  assets: ModelAsset[]
  verbose: boolean
  threadCount: number
  update: boolean
  textureSize: number
  binary: boolean
  draco: boolean
  webp: boolean
  ktx: boolean
}
async function convertModels({
  assets,
  inputDir,
  transitDir,
  outputDir,
  verbose,
  threadCount,
  update,
  textureSize,
  binary,
  draco,
  webp,
  ktx,
}: ConvertModelsOptions) {
  const models = await selectModels({
    sourceRoot: inputDir,
    assets: assets,
  })
  const materials = await selectMaterials({
    sourceRoot: inputDir,
    assets: assets,
  })
  const textures = await selectTextures({
    sourceRoot: inputDir,
    assets: assets,
  })

  logger.verbose(true)
  logger.info(
    [
      '',
      `    assets: ${logger.ansi.yellow(String(assets.length))}`,
      `    models: ${logger.ansi.yellow(String(models.length))}`,
      ` materials: ${logger.ansi.yellow(String(materials.length))}`,
      `  textures: ${logger.ansi.yellow(String(textures.length))}`,
      ``,
    ].join('\n'),
  )
  logger.info('Step 1/4: Convert and copy textures')
  logger.verbose(verbose)

  await runTasks({
    threads: threadCount,
    taskName: 'processTexture',
    tasks: textures.map((texture) => {
      return {
        sourceRoot: inputDir,
        targetRoot: transitDir,
        texture: texture,
        update: update,
        texSize: textureSize,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 2/4: Copy materials')
  logger.verbose(verbose)

  await runTasks<'copyMaterial'>({
    taskName: 'copyMaterial',
    tasks: materials.map((file) => {
      return {
        sourceRoot: inputDir,
        targetRoot: transitDir,
        material: file,
        update: update,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 3/4: Convert and copy models')
  logger.verbose(verbose)
  await runTasks({
    threads: threadCount,
    taskName: 'preprocessModel',
    tasks: models.map(({ model, material, hash }) => {
      return {
        sourceRoot: inputDir,
        targetRoot: transitDir,
        hash: hash,
        update,
        model: model,
        material: material,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 4/4: Generate item variations')
  logger.verbose(verbose)
  await runTasks({
    threads: threadCount,
    taskName: 'processModel',
    tasks: assets.map((asset) => {
      return {
        ...asset,
        sourceRoot: inputDir,
        transitRoot: transitDir,
        targetRoot: outputDir,
        update,
        binary,
        webp,
        draco,
        ktx,
      }
    }),
  })
}

async function writeStats({ outDir, assets }: { assets: ModelAsset[]; outDir: string }) {
  let assetCount = assets.length
  let fileCount = 0
  let filesMissing = 0
  let sizeInBytes = 0

  const stats = assets.map((item) => {
    const modelFile = path.join(outDir, item.outDir, item.outFile).toLowerCase()
    const modelExists = fs.existsSync(modelFile)
    const modelSize = modelExists ? fs.statSync(modelFile).size : 0
    fileCount += modelExists ? 1 : 0
    filesMissing += modelExists ? 0 : 1
    sizeInBytes += modelSize

    return {
      ...item,
      meshCount: item.meshes.length,
      filePath: modelFile,
      fileSize: modelSize,
      hasModel: modelExists && modelSize > 0,
    }
  })

  logger.info(
    [
      ``,
      `       assets: ${logger.ansi.yellow(String(assetCount))}`,
      `    converted: ${logger.ansi.yellow(String(fileCount))}`,
      `       failed: ${
        filesMissing ? logger.ansi.red(String(filesMissing)) : logger.ansi.green(String(filesMissing))
      }`,
      `         size: ${logger.ansi.yellow(String(Math.round(sizeInBytes / 1024 / 1024)))} MB`,
      ``,
    ].join('\n'),
  )

  await writeFile(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), {
    encoding: 'utf-8',
  })
}
