import 'colors'
import { program } from 'commander'
import * as fs from 'fs'
import { cpus } from 'os'
import * as path from 'path'
import * as cp from 'child_process'
import express from 'express'

import {
  collectAssets,
  collectMaterials,
  collectModels,
  collectTextures,
  filterAssetsBySkinName,
  filterAssetsModelMaterialHash,
  isInListFilter,
  matchesAnyInList,
  readTables,
} from './collect-assets'
import { GAME_DIR, MODELS_DIR, SLICES_DIR, TABLES_DIR, UNPACK_DIR } from './env'
import { datasheetConverter } from './tools/datasheet-converter'
import { pakExtractor } from './tools/pak-extractor'
import { ItemAppearanceDefinition, ModelAsset } from './types'
import { logger, spawn, wrapError, writeFile } from './utils'
import { runTasks } from './worker'
import { objectStreamConverter } from './tools/object-stream-converter'
import { sumBy, uniq } from 'lodash'
import { ktxCreate } from './tools/ktx-create'

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
      include:
        '(?i)(^objects|^textures|^materials|^engineassets|^sharedassets[/\\\\]springboardentitites[/\\\\]datatables|^slices[/\\\\]housing)',
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

program.command('test-ktx')
  .action(async () => {
    logger.verbose(true)
    const res = await ktxCreate({
      format: 'R8G8B8_UNORM',
      input: fs.readFileSync('E:\\Projects\\nw-models\\packages\\cli\\tools\\sample\\male_masterofceremonies_diff.png'),
      // input: fs.createReadStream('E:\\Projects\\nw-models\\packages\\cli\\tools\\sample\\male_masterofceremonies_diff.png', {
      //   encoding: 'binary'
      // }),
    }).catch(console.error)
    logger.debug(res)
  })

program
  .command('convert-slices')
  .description('Converts slices to JSON format')
  .requiredOption('-i, --input [dataDir]', 'Path to the unpacked game data directory', path.join(UNPACK_DIR, 'slices'))
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
  .option('-id, --id <appearanceId>', 'Filter by appearance id (may be substring)')
  .option('-iid, --itemId <itemId>', 'Filter by item id (may be substring)')
  .option('-hash, --hash <md5Hash>', 'Filter by md5 hash (must be exact)')
  .option('-skin, --skinFile <skinFileName>', 'Filter by skin file name (may be substring)')
  .option('-u, --update', 'Ignores and overrides previous export')
  .option('--draco', 'Enables Draco compression (default is disabled)')
  .option('--webp', 'Converts textures to wepb before embedding into model (default is kept png)')
  .option('--ktx', 'Compresses textures with ktx tools (KTX Tools must be installed)')
  .option('--glb', 'Exports binary GLTF .glb files (default is JSON .gltf)')
  .option('-t, --threads <threadCount>', 'Number of threads', String(cpus().length))
  .option(
    '-ts, --texture-size <textureSize>',
    'Makes all textures the same size. Should be a power of 2 value (512, 1024, 2048 etc)',
    '1024',
  )
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', opts)

    const input: string = opts.input
    const output: string = opts.output
    const tablesDir: string = opts.tables
    const slicesDir: string = opts.slices
    const id: string = opts.id
    const itemId: string = opts.itemId
    const skinFile: string = opts.skinFile
    const hash: string = opts.hash
    const update: boolean = opts.update
    const binary: boolean = opts.glb
    const draco: boolean = opts.draco
    const webp: boolean = opts.webp
    const ktx: boolean = opts.ktx
    const threads: number = Number(opts.threads) || 0
    const verbose: boolean = opts.verbose ?? !threads
    const textureSize: number = Number(opts.textureSize) || null

    logger.info('Resolving available assets')
    const tables = await readTables({ tablesDir: tablesDir }).then((data) => {

      if (itemId) {
        const itemIds = itemId.toLowerCase().split(',')
        data.items = data.items.filter(matchesAnyInList('ItemID', itemIds))
        data.housingItems = data.housingItems.filter(matchesAnyInList('HouseItemID', itemIds))

        const appearanceIds = uniq(data.items.map((it) => [
          it.ArmorAppearanceF,
          it.ArmorAppearanceM,
          it.WeaponAppearanceOverride,
        ]).flat(1)).filter((it) => !!it).map((it) => it.toLowerCase())

        data = {
          ...data,
          itemAppearances: data.itemAppearances.filter(isInListFilter('ItemID', appearanceIds)),
          weaponAppearances: data.weaponAppearances.filter(isInListFilter('WeaponAppearanceID', appearanceIds)),
          instrumentAppearances: data.instrumentAppearances.filter(isInListFilter('WeaponAppearanceID', appearanceIds)),
          weapons: data.weapons.filter(isInListFilter('WeaponID', appearanceIds)),
        }
      }

      if (id) {
        const ids = id.toLowerCase().split(',')
        data = {
          ...data,
          housingItems: data.housingItems.filter(matchesAnyInList('HouseItemID', ids)),
          itemAppearances: data.itemAppearances.filter(matchesAnyInList('ItemID', ids)),
          weaponAppearances: data.weaponAppearances.filter(matchesAnyInList('WeaponAppearanceID', ids)),
          instrumentAppearances: data.instrumentAppearances.filter(matchesAnyInList('WeaponAppearanceID', ids)),
          weapons: data.weapons.filter(matchesAnyInList('WeaponID', ids)),
        }
      }

      return data
    })

    const assets = await collectAssets({
      ...tables,
      sourceRoot: input,
      slicesRoot: slicesDir,
      extname: binary ? '.glb' : '.gltf'
    }).then((list) => {
      list = filterAssetsBySkinName(skinFile, list)
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

    logger.info(
      [
        '',
        `    assets: ${logger.ansi.yellow(String(assets.length))}`,
        `    models: ${logger.ansi.yellow(String(models.length))}`,
        `  textures: ${logger.ansi.yellow(String(textures.length))}`,
        ``,
      ].join('\n'),
    )

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
      tasks: models.map(({ model, material, hash }) => {
        return {
          sourceRoot: input,
          targetRoot: output,
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
      threads: threads,
      taskName: 'processModel',
      tasks: assets.map((asset) => {
        return {
          ...asset,
          sourceRoot: input,
          targetRoot: output,
          update,
          binary,
          webp,
          draco,
          ktx
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

program
  .command('viewer')
  .description('Starts the viewer server')
  .requiredOption('-p, --port [port]', 'Models directory to serve', String(9000))
  .requiredOption('-d, --dir [directory]', 'Models directory to serve', MODELS_DIR)
  .requiredOption('-vd, --viewerDir [viewerDir]', 'Viewer directory to serve', path.join(__dirname, '../viewer'))
  .action(async (options) => {
    const app = express()
    app.use(express.static(options.dir))
    app.use(express.static(options.viewerDir))
    app.listen(options.port, () => {
      console.log(`Viewer is served at http://localhost:${options.port}`)
    })
  })

program.parse(process.argv)

async function writeStats({ outDir, assets }: { assets: ModelAsset[]; outDir: string }) {
  let assetCount = assets.length
  let modelCount = 0
  let modelMissing = 0
  let sizeInBytes = 0

  const stats = assets.map((item) => {
    const modelFile = path.join(outDir, item.outDir, item.outFile).toLowerCase()
    const modelExists = fs.existsSync(modelFile)
    const modelSize = modelExists ? fs.statSync(modelFile).size : 0
    modelCount += modelExists ? 1 : 0
    modelMissing += modelExists ? 0 : 1
    sizeInBytes += modelSize

    return {
      ...item,
      filePath: modelFile,
      fileSize: modelSize,
      hasModel: modelExists && modelSize > 0,
    }
  })

  logger.info(
    [
      ``,
      `       assets: ${logger.ansi.yellow(String(assetCount))}`,
      `    converted: ${logger.ansi.yellow(String(modelCount))}`,
      `       failed: ${modelMissing ? logger.ansi.red(String(modelMissing)) : logger.ansi.green(String(modelMissing))}`,
      `         size: ${logger.ansi.yellow(String(Math.round(sizeInBytes / 1024 / 1024)))} MB`,
      ``,
    ].join('\n'),
  )

  await writeFile(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), {
    encoding: 'utf-8',
  })
}


