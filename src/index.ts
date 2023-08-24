import 'colors'
import { program } from 'commander'
import * as fs from 'fs'
import { cpus } from 'os'
import * as path from 'path'
import {
  byIdFilter,
  collectAssets,
  collectMaterials,
  collectModels,
  collectTextures,
  filterAssetsBySkinName,
  filterAssetsModelMaterialHash,
  readTables,
} from './collect-assets'
import { GAME_DIR, MODELS_DIR, SLICES_DIR, TABLES_DIR, UNPACK_DIR } from './env'
import { datasheetConverter } from './tools/datasheet-converter'
import { pakExtractor } from './tools/pak-extractor'
import { ModelAsset } from './types'
import { logger, wrapError, writeFile } from './utils'
import { runTasks } from './worker'
import { objectStreamConverter } from './tools/object-stream-converter'

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
      include: '(?i)(^objects|^textures|^materials|^engineassets|^sharedassets[/\\\\]springboardentitites[/\\\\]datatables|^slices[/\\\\]housing)',
      fixLua: true,
      decompressAzcs: true,
    }).catch(wrapError('pak-extractor failed'))
  })

program
  .command('convert-tables')
  .description('Converts data tables to JSON format')
  .requiredOption(
    '-i, --input [dataDir]',
    'Path to the unpacked game data directory',
    path.join(UNPACK_DIR, 'sharedassets/springboardentitites/datatables'),
  )
  .requiredOption('-o, --output [outDir]', 'Path to the tables directory', TABLES_DIR)
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
    }).catch(wrapError('datasheet-converter failed'))
  })

  
program
.command('convert-slices')
.description('Converts slices to JSON format')
.requiredOption(
  '-i, --input [dataDir]',
  'Path to the unpacked game data directory',
  path.join(UNPACK_DIR, 'slices'),
)
.requiredOption('-o, --output [outDir]', 'Path to the tables directory', SLICES_DIR)
.action(async (options) => {
  logger.verbose(true)
  logger.debug('convert-slices', JSON.stringify(options, null, 2))

  const input = options.input
  const output = options.output

  await objectStreamConverter({
    threads: Math.min(cpus().length, 10),
    input: input,
    output: output,
    pretty: true,
  }).catch(wrapError('object-stream-converter failed'))
})

program
  .command('convert')
  .description('Converts models to GLTF file format')
  .requiredOption('-i, --input [inputDir]', 'Path to the unpacked game directory', UNPACK_DIR)
  .requiredOption('-d, --tables [tablesDir]', 'Path to the tables directory', TABLES_DIR)
  .requiredOption('-s, --slices [slicesDir]', 'Path to the slices directory', SLICES_DIR)
  .requiredOption('-o, --output [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option('-id, --id <appearanceId>', 'Filter by appearance id (may be part of ID)')
  .option('-hash, --hash <md5Hash>', 'Filter by md5 hash')
  .option('-skin, --skinFile <skinFileName>', 'Filter by skin file name (may be part of name)')
  .option('-u, --update', 'Ignores and overrides previous export')
  .option('-t, --threads <threadCount>', 'Number of threads', String(cpus().length))
  .option(
    '-ts, --texture-size <textureSize>',
    'Makes all textures the same size. Should be a power of 2 value (512, 1024, 2048 etc)',
    '1024',
  )
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', JSON.stringify(opts, null, 2))

    const input: string = opts.input
    const output: string = opts.output
    const tablesDir: string = opts.tables
    const slicesDir: string = opts.slices
    const id: string = opts.id
    const skinFile: string = opts.skinFile
    const hash: string = opts.hash
    const update: boolean = opts.update
    const threads: number = Number(opts.threads) || 0
    const verbose: boolean = opts.verbose ?? !threads
    const textureSize: number = Number(opts.textureSize) || null

    logger.info('Resolving available assets')
    const tables = await readTables({ tablesDir: tablesDir })
    const assets = await collectAssets({
      housingItems: tables.housingItems.filter(byIdFilter('HouseItemID', id)),
      itemAppearances: tables.itemAppearances.filter(byIdFilter('ItemID', id)),
      weaponAppearances: tables.weaponAppearances.filter(byIdFilter('WeaponAppearanceID', id)),
      instrumentAppearances: tables.instrumentAppearances.filter(byIdFilter('WeaponAppearanceID', id)),
      weapons: tables.weapons.filter(byIdFilter('WeaponID', id)),
      sourceRoot: input,
      slicesRoot: slicesDir
    })
      .then((list) => {
        list = filterAssetsBySkinName(skinFile, list)
        return list
      })
      .then((list) => {
        list = filterAssetsModelMaterialHash(hash, list)
        return list
      })
    const models = await collectModels({
      sourceRoot: input,
      assets: assets,
    })
    const materials = await collectMaterials({
      sourceRoot: input,
      assets: assets,
    })
    const textures = await collectTextures({
      sourceRoot: input,
      assets: assets,
    })

    logger.info({
      models: models.length,
      assets: assets.length,
      textures: textures.length,
    })

    logger.verbose(true)
    logger.info('Step 1/4: Convert and copy textures')
    logger.verbose(verbose)

    await runTasks({
      threads: threads,
      taskName: 'processTexture',
      tasks: textures.map((texture) => {
        return {
          sourceRoot: input,
          targetRoot: output,
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
          sourceRoot: input,
          targetRoot: output,
          material: file,
          update: update,
        }
      }),
    })

    logger.verbose(true)
    logger.info('Step 3/4: Convert and copy models')
    logger.verbose(verbose)
    await runTasks({
      threads: threads,
      taskName: 'preprocessModel',
      tasks: models.map(({ model, material, modelMaterialHash }) => {
        return {
          sourceRoot: input,
          targetRoot: output,
          modelMaterialHash: modelMaterialHash,
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
      threads: threads,
      taskName: 'processModel',
      tasks: assets.map((asset) => {
        return {
          ...asset,
          sourceRoot: input,
          targetRoot: output,
          update,
        }
      }),
    })

    logger.verbose(true)
    await writeStats({
      outDir: output,
      assets: assets,
    })

    logger.info('Done. Run `yarn viewer` to view the models.')
  })

program.parse(process.argv)

async function writeStats({ outDir, assets }: { assets: ModelAsset[]; outDir: string }) {
  const stats = assets
    .map((item) => {
      const modelFile = path.join(outDir, item.outDir, item.outFile).toLowerCase()
      const modelExists = fs.existsSync(modelFile)
      const modelSize = modelExists ? fs.statSync(modelFile).size : 0
      return {
        ...item,
        filePath: modelFile,
        fileSize: modelSize,
        hasModel: modelExists && modelSize > 0,
      }
    })
    .flat()

  await writeFile(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), {
    encoding: 'utf-8',
  })
}
