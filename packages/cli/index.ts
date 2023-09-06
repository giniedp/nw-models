import 'colors'
import { program } from 'commander'
import express from 'express'
import * as fs from 'fs'
import { cpus } from 'os'
import * as path from 'path'

import { uniq } from 'lodash'
import {
  collectAssets,
  filterAssetsBySkinName,
  filterAssetsModelMaterialHash,
  isInListFilter,
  matchesAnyInList,
  readTables,
  selectMaterials,
  selectModels,
  selectTextures,
} from './collect'
import { GAME_DIR, MODELS_DIR, SLICES_DIR, TABLES_DIR, TRANSIT_DIR, UNPACK_DIR } from './env'
import { datasheetConverter } from './tools/datasheet-converter'
import { objectStreamConverter } from './tools/object-stream-converter'
import { pakExtractor } from './tools/pak-extractor'
import { ModelAsset } from './types'
import { glob, logger, wrapError, writeFile } from './utils'
import { runTasks } from './worker'
import { parseMtlFile, readMtlFile } from './file-formats/mtl'
import { tsFromJson } from './utils/ts-from-json'

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
  .requiredOption('-x, --transit [transitDir]', 'Path to the intermediate directory', TRANSIT_DIR)
  .requiredOption('-o, --output [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option('-u, --update', 'Ignores and overrides previous export')
  .option('-tc, --thread-count <threadCount>', 'Number of threads', String(cpus().length))
  .option('-id, --id <id>', 'Filter by object identifier (may be substring, comma separated)')
  .option('-iid, --itemId <itemId>', 'Prefilter by ItemID (may be substring, comma separated)')
  .option('-hash, --hash <md5Hash>', 'Filter by md5 hash (must be exact, comma separated)')
  .option('-skin, --skin <skinFile>', 'Filter by skin file name (may be substring, comma separated)')
  .option('-at, --asset-type <assetType>', 'Filter by asset type. (must be exact, comma separated)')
  .option('--draco', 'Enables Draco compression', false)
  .option('--webp', 'Converts textures to wepb instead of png before embedding into model', false)
  .option('--ktx', 'Compresses textures to ktx instead of png before embedding into model', false)
  .option('--glb', 'Exports binary GLTF .glb files instead of .gltf JSON', false)
  .option('-ts, --texture-size <textureSize>', 'Resize all textures to given size.', '1024')
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')
  .option('-slice, --slice <sliceFile>', 'Forcefully convert a single slice file')
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', opts)

    const input: string = opts.input
    const output: string = opts.output
    const tablesDir: string = opts.tables
    const slicesDir: string = opts.slices
    const transitDir: string = opts.transit

    const ids: string[] = String(opts.id || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)
    const itemIds: string[] = String(opts.itemId || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)
    const hashes: string[] = String(opts.hash || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)
    const skinFiles: string[] = String(opts.skin || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)
    const assetTypes: string[] = String(opts.assetType || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)
    const slices: string[] = String(opts.slice || '')
      .toLowerCase()
      .split(',')
      .filter((it) => !!it)

    const textureSize: number = Number(opts.textureSize) || null
    const binary: boolean = opts.glb
    const draco: boolean = opts.draco
    const webp: boolean = opts.webp
    const ktx: boolean = opts.ktx

    const threads: number = Number(opts.threadCount) || 0
    const verbose: boolean = opts.verbose ?? !threads
    const update: boolean = opts.update

    logger.info('Resolving available assets')
    const tables = await readTables({ tablesDir: tablesDir }).then((data) => {
      if (itemIds.length) {
        data.items = data.items.filter(matchesAnyInList('ItemID', itemIds))
        data.housingItems = data.housingItems.filter(matchesAnyInList('HouseItemID', itemIds))

        const appearanceIds = uniq(
          data.items.map((it) => [it.ArmorAppearanceF, it.ArmorAppearanceM, it.WeaponAppearanceOverride]).flat(1),
        )
          .filter((it) => !!it)
          .map((it) => it.toLowerCase())

        data = {
          ...data,
          itemAppearances: data.itemAppearances.filter(isInListFilter('ItemID', appearanceIds)),
          weaponAppearances: data.weaponAppearances.filter(isInListFilter('WeaponAppearanceID', appearanceIds)),
          instrumentAppearances: data.instrumentAppearances.filter(isInListFilter('WeaponAppearanceID', appearanceIds)),
          weapons: data.weapons.filter(isInListFilter('WeaponID', appearanceIds)),
        }
      }

      if (ids.length) {
        data = {
          ...data,
          housingItems: data.housingItems.filter(matchesAnyInList('HouseItemID', ids)),
          itemAppearances: data.itemAppearances.filter(matchesAnyInList('ItemID', ids)),
          weaponAppearances: data.weaponAppearances.filter(matchesAnyInList('WeaponAppearanceID', ids)),
          instrumentAppearances: data.instrumentAppearances.filter(matchesAnyInList('WeaponAppearanceID', ids)),
          weapons: data.weapons.filter(matchesAnyInList('WeaponID', ids)),
        }
      }

      if (assetTypes.length) {
        // keep only selected asset types
        Object.keys(data).forEach((key: keyof typeof data) => {
          if (!assetTypes.includes(key.toLowerCase())) {
            data[key] = []
          }
        })
      } else if (!itemIds.length && !ids.length) {
        // exclude experimental stuff from default export
        data.housingItems = []
      }

      if (slices.length) {
        Object.keys(data).forEach((key: keyof typeof data) => {
          data[key] = []
        })
      }
      return data
    })

    const assets = await collectAssets({
      ...tables,
      sourceRoot: input,
      slicesRoot: slicesDir,
      extname: binary ? '.glb' : '.gltf',
      slices: slices,
    }).then((list) => {
      list = filterAssetsBySkinName(skinFiles, list)
      list = filterAssetsModelMaterialHash(hashes, list)
      return list
    })

    const models = await selectModels({
      sourceRoot: input,
      assets: assets,
    })
    const materials = await selectMaterials({
      sourceRoot: input,
      assets: assets,
    })
    const textures = await selectTextures({
      sourceRoot: input,
      assets: assets,
    })

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

    logger.verbose(true)
    logger.info('Step 1/4: Convert and copy textures')
    logger.verbose(verbose)

    await runTasks({
      threads: threads,
      taskName: 'processTexture',
      tasks: textures.map((texture) => {
        return {
          sourceRoot: input,
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
          sourceRoot: input,
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
      threads: threads,
      taskName: 'preprocessModel',
      tasks: models.map(({ model, material, hash }) => {
        return {
          sourceRoot: input,
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
      threads: threads,
      taskName: 'processModel',
      tasks: assets.map((asset) => {
        return {
          ...asset,
          sourceRoot: input,
          transitRoot: transitDir,
          targetRoot: output,
          update,
          binary,
          webp,
          draco,
          ktx,
        }
      }),
    })

    logger.verbose(true)
    await writeStats({
      outDir: output,
      assets: assets,
    })
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

program.command('inspect').action(async () => {
  const files = await glob(path.join(UNPACK_DIR, '**/*.mtl'))
  const samples: string[] = []
  for (const file of files) {
    const mtl = parseMtlFile(fs.readFileSync(file, { encoding: 'utf-8' }))
    samples.push(JSON.stringify(mtl))
  }
  const result = await tsFromJson('Material', samples)
  const code = result.lines.join('\n')
  fs.writeFileSync(path.join(process.cwd(), 'tmp/material.ts'), code, { encoding: 'utf-8' })
  // const params = new Set<string>()
  // let min = Number.MAX_VALUE
  // let max = Number.MIN_VALUE
  // for (const file of files) {
  //   const materials = await readMtlFile(file)
  //   for (const mtl of materials) {
  //     if (mtl.attrs.Shininess) {
  //       min = Math.min(min, Number(mtl.attrs.Shininess))
  //       max = Math.max(max, Number(mtl.attrs.Shininess))
  //     }
  //   }
  // }
  // console.log('Shininess', min, max)
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
      `    converted: ${logger.ansi.yellow(String(modelCount))}`,
      `       failed: ${
        modelMissing ? logger.ansi.red(String(modelMissing)) : logger.ansi.green(String(modelMissing))
      }`,
      `         size: ${logger.ansi.yellow(String(Math.round(sizeInBytes / 1024 / 1024)))} MB`,
      ``,
    ].join('\n'),
  )

  await writeFile(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), {
    encoding: 'utf-8',
  })
}
