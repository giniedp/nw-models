import 'colors'
import { program } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { cpus } from 'os'

import { collectInstrumentAppearances } from '../collect/collect-appearances-instrument'
import { collectItemAppearances } from '../collect/collect-appearances-items'
import { collectWeaponAppearances } from '../collect/collect-appearances-weapon'
import { collectCapitals } from '../collect/collect-capitals'
import { collectCdf } from '../collect/collect-cdf'
import { collectCgf } from '../collect/collect-cgf'
import { collectCostumeChanges } from '../collect/collect-costumechanges'
import { collectFile } from '../collect/collect-file'
import { collectHousingItems } from '../collect/collect-housing-items'
import { collectLevel } from '../collect/collect-level'
import { collectMounts } from '../collect/collect-mounts'
import { collectNpcs } from '../collect/collect-npcs'
import { collectSlices } from '../collect/collect-slices'
import { assetCollector } from '../collect/collector'
import { CONVERT_DIR, MODELS_DIR, UNPACK_DIR } from '../env'
import { getMaterialList, getMaterialTextures, loadMtlFile, readMtlFile } from '../file-formats/mtl'
import { ModelAsset } from '../types'
import { CaseInsensitiveMap, CaseInsensitiveSet, glob, logger, readJSONFile, replaceExtname, writeFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { runTasks } from '../worker'

program
  .command('convert-models')
  .description('Converts models to GLTF file format')
  .requiredOption('-ud, --unpack-dir [unpackDir]', 'Path to the unpacked game directory', UNPACK_DIR)
  .requiredOption('-cd, --convert-dir [convertDir]', 'Path to the intermediate directory', CONVERT_DIR)
  .requiredOption('-od, --output-dir [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option(
    '-sem, --skip-existing-models',
    'Skips model conversion if it already exists in output dir (e.g. from previous conversion)',
    false,
  )
  .option(
    '-set, --skip-exisitng-textures',
    'Skips texture conversion if it alreayd exists (e.g. from previous conversion)',
    false,
  )

  .option('-v, --verbose', 'Enables log output (automatically enabled if --thread-count is set 0)')
  .option('-tc, --thread-count <threadCount>', 'Number of threads', String(cpus().length))
  .option('-ts, --texture-size <textureSize>', 'Maximym texture size.')
  .option('-tf, --texture-format <textureFormat>', 'Output texture format.')
  .option('-tq, --texture-quality <textureQuality>', 'Texture conversion quality 0-100')
  .option('-embed, --embed', 'Embeds binary buffer inside the model file', true)
  .option('-no-embed, --no-embed', 'Does not embed binary buffer inside the model file')
  .option('-draco, --draco', 'Enables Draco compression', false)
  .option('-glb, --glb', 'Exports binary GLTF .glb files instead of .gltf JSON', false)

  // cdf
  .option('-cdf, --cdf <cdfFile>', 'Convert a specific .cdf file. (may be glob pattern)')
  .option('-adb, --adb <adbFile>', 'Animation database file to pull animations from')
  .option('-adba, --adb-actions [actions...]', 'Use only the listed actions (exact name)')
  // cgf
  .option('-cgf, --cgf [cgf...]', 'Convert a specific .cgf (or .skin) file. (may be glob pattern)')
  .option('-mtl, --mtl <materialFile>', 'Material file to use for all cgf files. ')
  .option('-cgf-out, --cgf-out <outputFile>', 'Output file, all cgf will be merged to one model.')
  // slices
  .option('-slice, --slice <sliceFile>', 'Converts models from .dynamicslice files. (may be glob pattern)')
  .option('-recursive, --recursive', 'Recursively process slice file. (potentially huge model output)')
  .option(
    '-slice-out, --slice-out <outputFile>',
    'Output file. Geometry from all processed slices is merged into one model.',
  )
  // levels, entities xml
  .option('-level, --level [ids...]', 'Converts levels from levels directory.')
  // capitals
  .option('-capital, --capital <capitalFile>', 'Converts models from .capitals files. (may be glob pattern)')
  .option('-merge, --merge', 'Merges all capital files into one giant model.')
  // costumes
  .option(
    '-costumes, --costumes [ids...]',
    'Converts all costumes from costumes table. Models are placed in "costumechanges" directory. If list of ids is provided, only those costumes are converted.',
  )
  // npcs
  .option(
    '-npcs, --npcs [ids...]',
    'Converts all npcs from npcs table. Models are placed in "npcs" directory. If list of ids is provided, only those npcs are converted.',
  )
  // mounts
  .option(
    '-mounts, --mounts [ids...]',
    'Converts all mounts from mounts table. Models are placed in "mounts" directory. If list of ids is provided, only those mounts are converted.',
  )
  // housing items
  .option(
    '-housing, --housing [ids...]',
    'Converts all housing items from housing items tables. Models are placed in "housingitems" directory. If list of ids is provided, only those items are converted.',
  )
  // appearances
  .option('-instruments, --instruments [ids...]', 'Converts instruments appearances')
  .option('-weapons, --weapons [ids...]', 'Converts weapon appearances')
  .option('-items, --items [ids...]', 'Converts items appearances')
  .option('-items-m-chr, --items-m-chr-file <file>', 'Uses the skeleton from the given file for male items.')
  .option('-items-f-chr, --items-f-chr-file <file>', 'Uses the skeleton from the given file for female items.')
  // from process file
  .option('-file, --file [specFile]')
  .option('-id, --id [ids...]')
  //
  .option('-dry, --dry')
  //
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', opts)

    const threads: number = Number(opts.threadCount) || 0
    const options: ConvertModelsOptions = {
      inputDir: opts.unpackDir,
      convertDir: opts.convertDir,
      outputDir: opts.outputDir,
      catalogFile: path.join(opts.convertDir, 'assetcatalog.json'),

      textureSize: Number(opts.textureSize) || null,
      textureFormat: opts.textureFormat,
      textureQuality: Number(opts.textureQuality) || null,
      binary: !!opts.glb,
      draco: !!opts.draco,
      embed: !!opts.embed,

      verbose: opts.verbose ?? !threads,
      threadCount: threads,
      updateModels: !opts.skipExistingModels,
      updateTextures: !opts.skipExistingTextures,

      assets: [],
    }

    const slicesDir = path.join(options.convertDir, 'slices')
    const tablesDir = path.join(options.convertDir, 'sharedassets', 'springboardentitites', 'datatables')
    const catalogFile = options.catalogFile
    const catalog = await readJSONFile<Record<string, string>>(catalogFile)

    const collector = assetCollector({
      inputDir: options.inputDir,
      tablesDir: tablesDir,
      slicesDir: slicesDir,
      catalog: catalog,
      modelFormat: options.binary ? 'glb' : 'gltf',
    })

    function paramList(param: unknown) {
      if (!Array.isArray(param)) {
        return null
      }
      return param.map((it: string) => it.toLowerCase().trim())
    }

    async function globFiles(dir: string, pattern: string | string[]) {
      const patterns = (Array.isArray(pattern) ? pattern : [pattern]).map((it) => path.join(dir, it))
      const files = await glob(patterns)
      return files.map((it) => path.relative(dir, it))
    }

    if (opts.cdf) {
      await collectCdf(collector, {
        files: await globFiles(options.inputDir, opts.cdf),
        adbFile: opts.adb,
        actions: paramList(opts.adbActions),
        tags: paramList(opts.tags),
      })
    }

    if (opts.cgf) {
      await collectCgf(collector, {
        files: await globFiles(options.inputDir, paramList(opts.cgf)),
        material: opts.mtl,
        outFile: opts.cgfOut,
      })
    }

    if (opts.slice) {
      await collectSlices(collector, {
        files: await globFiles(options.convertDir, opts.slice),
        convertDir: options.convertDir,
        outFile: opts.sliceOut,
      })
    }

    if (opts.capital) {
      const ids = paramList(opts.id)
      await collectCapitals(collector, {
        files: await globFiles(options.convertDir, opts.capital),
        convertDir: options.convertDir,
        merge: !!opts.merge,
        filter: (item) => !ids || ids.includes(item.id),
      })
    }

    if (opts.housing) {
      const ids = paramList(opts.housing)
      await collectHousingItems(collector, {
        filter: (item) => !ids || ids.includes(item.HouseItemID.toLowerCase()),
      })
    }

    if (opts.npcs) {
      const ids = paramList(opts.npcs)
      await collectNpcs(collector, {
        filter: (item) => !ids || ids.includes(item.VariantID.toLowerCase()),
      })
    }

    if (opts.costumes) {
      const ids = paramList(opts.costumes)
      await collectCostumeChanges(collector, {
        filter: (item) => !ids || ids.includes(item.CostumeChangeId.toLowerCase()),
      })
    }

    if (opts.mounts) {
      const ids = paramList(opts.mounts)
      await collectMounts(collector, {
        filter: (item) => !ids || ids.includes(item.MountId.toLowerCase()),
      })
    }

    if (opts.instruments) {
      const ids = paramList(opts.instruments)
      await collectInstrumentAppearances(collector, {
        filter: (item) => !ids || ids.includes(item.WeaponAppearanceID.toLowerCase()),
      })
    }
    if (opts.weapons) {
      const ids = paramList(opts.weapons)
      await collectWeaponAppearances(collector, {
        // embedApperance: true,
        filter: (item) => !ids || ids.includes(item.WeaponAppearanceID.toLowerCase()),
      })
    }
    if (opts.items) {
      const ids = paramList(opts.items)
      await collectItemAppearances(collector, {
        maleChrFile: opts.itemsMChrFile,
        femaleChrFile: opts.itemsFChrFile,
        filter: (item) =>
          !ids || ids.includes(item.ItemID.toLowerCase()) || ids.includes(item.AppearanceName?.toLowerCase()),
      })
    }

    if (opts.file) {
      const ids = paramList(opts.id)
      await collectFile(collector, {
        file: opts.file,
        filter: (item) => !ids || ids.includes(item.id.toLowerCase()),
        convertDir: options.convertDir,
      })
    }

    if (opts.level) {
      const ids = paramList(opts.level)
      await collectLevel(collector, {
        filter: (level) => !ids || ids.includes(level.toLowerCase()),
      })
    }

    options.assets = collector.assets()

    if (!options.assets.length) {
      logger.info('No models found to convert')
      return
    }

    if (opts.dry) {
      await dryRun(options)
    } else {
      await convertModels(options)
    }
  })

interface ConvertModelsOptions {
  inputDir: string
  convertDir: string
  outputDir: string
  catalogFile: string
  assets: ModelAsset[]
  verbose: boolean
  threadCount: number
  updateModels: boolean
  updateTextures: boolean
  textureSize: number
  textureFormat: 'jpeg' | 'png' | 'webp' | 'avif'
  textureQuality: number
  embed: boolean
  binary: boolean
  draco: boolean
}
async function convertModels({
  assets,
  inputDir,
  convertDir,
  outputDir,
  catalogFile,
  verbose,
  threadCount,
  updateModels,
  updateTextures,
  textureSize,
  textureFormat,
  textureQuality,
  embed,
  binary,
  draco,
}: ConvertModelsOptions) {
  const materials = await selectMaterials({
    assets: assets,
  })
  const textures = await selectTextures({
    sourceRoot: inputDir,
    assets: assets,
    catalog: await readJSONFile(catalogFile),
  })

  logger.verbose(true)
  logger.info(
    [
      '',
      `    models: ${logger.ansi.yellow(String(assets.length))}`,
      ` materials: ${logger.ansi.yellow(String(materials.length))}`,
      `  textures: ${logger.ansi.yellow(String(textures.length))}`,
      ``,
    ].join('\n'),
  )
  logger.info('Step 1/3: Convert and copy textures')
  logger.verbose(verbose)

  await runTasks({
    label: 'Textures',
    threads: threadCount,
    taskName: 'processTexture',
    tasks: textures.map((texture) => {
      return {
        inputDir: inputDir,
        outputDir: convertDir,
        texture: texture,
        update: updateTextures,
        texSize: textureSize,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 2/3: Copy materials')
  logger.verbose(verbose)

  await runTasks<'copyMaterial'>({
    label: 'Materials',
    taskName: 'copyMaterial',
    tasks: materials.map((file) => {
      return {
        inputDir: inputDir,
        outputDir: convertDir,
        material: file,
        update: true,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 3/3: Generate models')
  logger.verbose(verbose)
  await runTasks({
    label: 'Models',
    threads: threadCount,
    taskName: 'processModel',
    tasks: assets.map((asset) => {
      return {
        ...asset,
        inputDir,
        convertDir,
        outputDir,

        update: updateModels,
        binary,
        draco,
        embed,
        textureFormat,
        textureQuality,
        catalogFile,
      }
    }),
  })

  writeAssets({ assets, outputDir })
}

async function selectTextures({
  sourceRoot,
  assets,
  catalog,
}: {
  sourceRoot: string
  assets: ModelAsset[]
  catalog: Record<string, string>
}) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    const mtlTags = new CaseInsensitiveSet<string>()
    const texTags = new CaseInsensitiveSet<string>()
    for (const mesh of asset.meshes) {
      const mtl = await loadMtlFile(mesh.material, {
        inputDir: sourceRoot,
        catalog: catalog,
      })
      for (const it of mtl) {
        mtlTags.add(it.Shader)
        const textures = getMaterialTextures(it) || []
        for (const texture of textures) {
          texTags.add(texture.Map)

          result.add(replaceExtname(texture.File, '.dds'))
        }
      }
    }
  }
  return Array.from(result)
}

async function selectMaterials({ assets }: { assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    for (const mesh of asset.meshes) {
      result.add(mesh.material)
    }
  }
  return Array.from(result)
}

interface StatsRow {
  dir: string
  file: string
  exists: boolean
  size: number
}

async function writeAssets({ assets, outputDir }: { assets: ModelAsset[]; outputDir: string }) {
  const statsFile = path.join(outputDir, 'assets.json')
  const stats = new Map<string, StatsRow>()

  if (fs.existsSync(statsFile)) {
    const rows = JSON.parse(fs.readFileSync(statsFile, 'utf-8')) as StatsRow[]
    for (const row of rows) {
      stats.set(path.normalize(path.join(row.dir, row.file)), row)
    }
  }

  for (const asset of assets) {
    const filePath = path.join(outputDir, asset.outFile)
    const exists = fs.existsSync(filePath)
    const size = exists ? fs.statSync(filePath).size : 0
    const dir = path.dirname(asset.outFile)
    const file = path.basename(asset.outFile)
    stats.set(path.normalize(asset.outFile), { dir, file, exists, size })
  }
  await writeFile(statsFile, JSON.stringify(Array.from(stats.values()), null, 2), {
    encoding: 'utf-8',
    createDir: true,
  })
}

async function dryRun(options: ConvertModelsOptions) {
  const shaders = new CaseInsensitiveMap<string, number>()
  const features = new CaseInsensitiveMap<string, number>()
  const variants = new CaseInsensitiveMap<string, number>()
  await withProgressBar({ tasks: options.assets }, async (asset, i, log) => {
    for (const mesh of asset.meshes) {
      const file = mesh.material
      if (!file) {
        continue
      }
      const doc = await readMtlFile(path.join(options.inputDir, file))
      const materials = getMaterialList(doc?.Material)
      for (const material of materials) {
        const shader = (material.Shader || '')
        if (shaders.has(shader)) {
          shaders.set(shader, shaders.get(shader) + 1)
        } else {
          shaders.set(shader, 1)
        }

        const tokens = (material.StringGenMask || '').split('%').filter((it) => it)
        for (const it of tokens) {
          if (features.has(it)) {
            features.set(it, features.get(it) + 1)
          } else {
            features.set(it, 1)
          }
        }

        const variant = tokens.toSorted().join(' ')
        if (variants.has(variant)) {
          variants.set(variant, variants.get(variant) + 1)
        } else {
          variants.set(variant, 1)
        }
      }
    }
  })

  console.log(Object.fromEntries(shaders.entries()))
  console.log(Object.fromEntries(features.entries()))
  console.log(Object.fromEntries(variants.entries()))
}
