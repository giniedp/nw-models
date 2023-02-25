import 'colors'
import { program } from 'commander'
import * as path from 'path'
import * as fs from 'fs'
import rimraf from 'rimraf'
import {
  collectAssets,
  collectMaterials,
  collectModels,
  collectTextures,
  filterAssetsByItemId,
  filterAssetsBySkinName,
  readTables,
} from './collect-assets'
import { GAME_DIR, MODELS_DIR, UNPACK_DIR } from './env'
import { datasheetConverter } from './tools/datasheet-converter'
import { pakExtractor } from './tools/pak-extractor'
import { glob, logger, wrapError, writeFile } from './utils'
import { runTasks } from './worker'
import { ModelAsset } from './types'

program
  .command('unpack')
  .description('Extracts new world data and converts datatables to JSON')
  .requiredOption('-i, --input [gameDir]', 'Path to the game directory', GAME_DIR)
  .requiredOption('-o, --output [outDir]', 'Path to the unpack directory', UNPACK_DIR)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('unpack', JSON.stringify(options, null, 2))

    const input = options.input
    const output = options.output

    // TODO: only pull relevant model data
    // https://github.com/new-world-tools/new-world-tools/issues/4
    await pakExtractor({
      threads: 6,
      assets: path.join(input, 'assets'),
      output: output,
      fixLua: true,
      decompressAzcs: true,
    }).catch(wrapError('pak-extractor failed'))

    const tablesDir = path.join(output, 'sharedassets/springboardentitites/datatables')
    await datasheetConverter({
      threads: 6,
      input: tablesDir,
      output: tablesDir,
      format: 'json',
      keepStructure: true,
      pretty: true,
    }).catch(wrapError('datasheet-converter failed'))

    const files = await glob(path.join(tablesDir, '**', '*.datasheet'))
    for (const file of files) {
      rimraf.sync(file)
    }
  })

program
  .command('convert')
  .description('Converts models to GLTF file format')
  .requiredOption('-i, --input [inputDir]', 'Path to the unpacked game directory', UNPACK_DIR)
  .requiredOption('-o, --output [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option('-id, --id <itemId>', 'Filter by item id (may be part of ID)')
  .option('-skin, --skinFile <skinFileName>', 'Filter by skin file name (may be part of name)')
  .option('-u, --update', 'Ignores and overrides previous export')
  .option('-t, --threads <threadCount>', 'Number of threads', '6')
  .option('-ts, --texture-size <textureSize>', 'Makes all textures the same size. Should be a power of 2 value (512, 1024, 2048 etc)', '1024')
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', JSON.stringify(opts, null, 2))

    const input: string = opts.input
    const output: string = opts.output
    const id: string = opts.id
    const skinFile: string = opts.skinFile
    const update: boolean = opts.update
    const threads: number = Number(opts.threads) || 0
    const verbose: boolean = opts.verbose ?? !threads
    const textureSize: number = Number(opts.textureSize) || null

    logger.info('Resolving available assets')
    const tables = await readTables({ tablesDir: input })
    const assets = await collectAssets({
      items: tables.items,
      itemAppearances: tables.appearances,
      weaponAppearances: tables.weapons,
      sourceRoot: input,
    }).then((list) => {
      list = filterAssetsByItemId(id, list)
      list = filterAssetsBySkinName(skinFile, list)
      return list
    })

    logger.info('Assets to convert:', assets.length)

    logger.verbose(true)
    logger.info('Step 1/4: Convert and copy textures')
    logger.verbose(verbose)
    const textures = await collectTextures({
      sourceRoot: input,
      assets: assets,
    })
    await runTasks({
      threads: threads,
      taskName: 'processTexture',
      tasks: textures.map((texture) => {
        return {
          sourceRoot: input,
          targetRoot: output,
          texture: texture,
          update: update,
          texSize: textureSize
        }
      }),
    })

    logger.verbose(true)
    logger.info('Step 2/4: Copy materials')
    logger.verbose(verbose)
    const materials = await collectMaterials({
      sourceRoot: input,
      assets: assets,
    })
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
    const models = await collectModels({
      sourceRoot: input,
      assets: assets,
    })
    await runTasks({
      threads: threads,
      taskName: 'preprocessModel',
      tasks: models.map(({ model, material }) => {
        return {
          sourceRoot: input,
          targetRoot: output,
          update,
          model: model,
          material: material
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

    logger.info('Done. You may run `yarn viewer` to view the models.')
  })

program.parse(process.argv)

async function writeStats({ outDir, assets }: { assets: ModelAsset[]; outDir: string }) {
  const stats = assets
    .map(({ refId, tags, items }) => {
      const modelFile = path.join(outDir, `${refId}.gltf`).toLowerCase()
      const modelExists = fs.existsSync(modelFile)
      const modelSize = modelExists ? fs.statSync(modelFile).size : 0
      return items.map(({ ItemID, ItemType }) => {
        return {
          filePath: modelFile,
          fileSize: modelSize,
          hasModel: modelExists && modelSize > 0,
          tags,
          itemId: ItemID,
          itemType: ItemType,
        }
      })
    })
    .flat()

  await writeFile(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), {
    encoding: 'utf-8',
  })
}
