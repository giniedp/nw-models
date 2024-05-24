import 'colors'
import { program } from 'commander'
import * as fs from 'fs'
import { cpus } from 'os'
import * as path from 'path'

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
import { collectWeapons } from '../collect/collect-weapons'
import { assetCollector } from '../collect/collector'
import { CONVERT_DIR, MODELS_DIR, UNPACK_DIR } from '../env'
import { getMtlTextures, getSubMaterials, loadMtlFile, readMtlFile } from '../file-formats/mtl'
import { ModelAsset } from '../types'
import { CaseInsensitiveMap, CaseInsensitiveSet, glob, logger, readJSONFile, replaceExtname, writeFile } from '../utils'
import { withProgressBar } from '../utils/progress'
import { runTasks } from '../worker'

program
  .command('convert-models')
  .description('Converts models to GLTF file format')
  .requiredOption('-i, --unpack-dir [unpackDir]', 'Path to the unpacked game directory', UNPACK_DIR)
  .requiredOption('-c, --convert-dir [convertDir]', 'Path to the intermediate directory', CONVERT_DIR)
  .requiredOption('-o, --output-dir [outputDir]', 'Output Path to the output directory', MODELS_DIR)
  .option(
    '-u, --update <mode>',
    'Ignores previously converted and exported data and overrides files. (may be all or models)',
    'all',
  )
  .option('-tc, --thread-count <threadCount>', 'Number of threads', String(cpus().length))
  .option('-ts, --texture-size <textureSize>', 'Resize all textures to given size.')
  .option('--embed', 'Embeds binary buffer inside the model file', true)
  .option('--no-embed', 'Does not embed binary buffer inside the model file')
  .option('--draco', 'Enables Draco compression', false)
  .option('--webp', 'Converts textures to wepb instead of png before embedding into model', false)
  .option('--ktx', 'Compresses textures to ktx instead of png before embedding into model', false)
  .option('--glb', 'Exports binary GLTF .glb files instead of .gltf JSON', false)
  .option('--verbose', 'Enables log output (automatically enabled if threads is 0)')
  .option('--animations', 'Enables animations', false)

  // cdf
  .option('-cdf, --cdf <cdfFile>', 'Convert a specific .cdf file. (may be glob pattern)')
  // cgf
  .option('-cgf, --cgf <cgfFile>', 'Convert a specific .cgf (or .skin) file. (may be glob pattern)')
  // slices
  .option('-slice, --slice <sliceFile>', 'Converts models from .dynamicslice files. (may be glob pattern)')
  .option('-recursive, --recursive', 'Recursively process slice file. (potentially huge model output)')
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
  // housing items
  .option('-appearance, --appearance [ids...]', 'Converts weapon,item,instrument appearances.')
  // from process file
  .option('-file, --file [specFile]')
  .option('-id, --id [ids...]')
  //
  .option('-debug, --debug')
  //
  .action(async (opts) => {
    logger.verbose(true)
    logger.debug('convert', opts)

    const threads: number = Number(opts.threadCount) || 0
    const options: ConvertModelsOptions = {
      inputDir: opts.unpackDir,
      convertDir: opts.convertDir,
      outputDir: opts.outputDir,

      textureSize: Number(opts.textureSize) || null,
      binary: !!opts.glb,
      draco: !!opts.draco,
      webp: !!opts.webp,
      ktx: !!opts.ktx,
      embed: !!opts.embed,

      verbose: opts.verbose ?? !threads,
      threadCount: threads,
      update: opts.update,

      assets: [],
    }

    const slicesDir = path.join(options.convertDir, 'slices')
    const tablesDir = path.join(options.convertDir, 'sharedassets', 'springboardentitites', 'datatables')
    const catalogFile = path.join(options.convertDir, 'assetcatalog.json')
    const catalog = await readJSONFile<Record<string, string>>(catalogFile)

    const collector = assetCollector({
      inputDir: options.inputDir,
      tablesDir: tablesDir,
      slicesDir: slicesDir,
      catalog: catalog,
      modelFormat: options.binary ? 'glb' : 'gltf',
    })

    function idsFromParam(param: unknown) {
      if (!Array.isArray(param)) {
        return null
      }
      return param.map((it: string) => it.toLowerCase())
    }

    async function globFiles(dir: string, pattern: string) {
      const files = await glob(path.join(dir, pattern))
      return files.map((it) => path.relative(dir, it))
    }

    if (opts.cdf) {
      await collectCdf(collector, {
        files: await globFiles(options.inputDir, opts.cdf),
      })
    }

    if (opts.cgf) {
      await collectCgf(collector, {
        files: await globFiles(options.inputDir, opts.cgf),
      })
    }

    if (opts.slice) {
      await collectSlices(collector, {
        files: await globFiles(options.convertDir, opts.slice),
        convertDir: options.convertDir,
      })
    }

    if (opts.capital) {
      const ids = idsFromParam(opts.id)
      await collectCapitals(collector, {
        files: await globFiles(options.convertDir, opts.capital),
        convertDir: options.convertDir,
        merge: !!opts.merge,
        filter: (item) => !ids || ids.includes(item.id),
      })
    }

    if (opts.housing) {
      const ids = idsFromParam(opts.housing)
      await collectHousingItems(collector, {
        filter: (item) => !ids || ids.includes(item.HouseItemID.toLowerCase()),
      })
    }

    if (opts.npcs) {
      const ids = idsFromParam(opts.npcs)
      await collectNpcs(collector, {
        filter: (item) => !ids || ids.includes(item.VariantID.toLowerCase()),
      })
    }

    if (opts.costumes) {
      const ids = idsFromParam(opts.costumes)
      await collectCostumeChanges(collector, {
        filter: (item) => !ids || ids.includes(item.CostumeChangeId.toLowerCase()),
      })
    }

    if (opts.mounts) {
      const ids = idsFromParam(opts.mounts)
      await collectMounts(collector, {
        filter: (item) => !ids || ids.includes(item.MountId.toLowerCase()),
      })
    }

    if (opts.appearance) {
      const ids = idsFromParam(opts.appearance)
      await collectWeapons(collector, {
        filter: (item) => !ids || ids.includes(item.WeaponID.toLowerCase()),
      })
      await collectWeaponAppearances(collector, {
        filter: (item) => !ids || ids.includes(item.WeaponAppearanceID.toLowerCase()),
      })
      await collectInstrumentAppearances(collector, {
        filter: (item) => !ids || ids.includes(item.WeaponAppearanceID.toLowerCase()),
      })
      await collectItemAppearances(collector, {
        filter: (item) =>
          !ids || ids.includes(item.ItemID.toLowerCase()) || ids.includes(item.AppearanceName?.toLowerCase()),
      })
    }

    if (opts.file) {
      const ids = idsFromParam(opts.id)
      await collectFile(collector, {
        file: opts.file,
        filter: (item) => !ids || ids.includes(item.id.toLowerCase()),
        convertDir: options.convertDir,
      })
    }

    if (opts.level) {
      const ids = idsFromParam(opts.level)
      await collectLevel(collector, {
        filter: (level) => !ids || ids.includes(level.toLowerCase()),
      })
    }

    options.assets = collector.assets()

    if (!options.assets.length) {
      logger.info('No models found to convert')
      return
    }

    if (opts.debug) {
      await debugCollection(options)
    } else {
      await convertModels(options)
    }
  })

interface ConvertModelsOptions {
  inputDir: string
  convertDir: string
  outputDir: string
  assets: ModelAsset[]
  verbose: boolean
  threadCount: number
  update: 'all' | 'models'
  textureSize: number
  embed: boolean
  binary: boolean
  draco: boolean
  webp: boolean
  ktx: boolean
}
async function convertModels({
  assets,
  inputDir,
  convertDir,
  outputDir,
  verbose,
  threadCount,
  update,
  textureSize,
  embed,
  binary,
  draco,
  webp,
  ktx,
}: ConvertModelsOptions) {
  const materials = await selectMaterials({
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
      `    models: ${logger.ansi.yellow(String(assets.length))}`,
      ` materials: ${logger.ansi.yellow(String(materials.length))}`,
      `  textures: ${logger.ansi.yellow(String(textures.length))}`,
      ``,
    ].join('\n'),
  )
  logger.info('Step 1/3: Convert and copy textures')
  logger.verbose(verbose)

  await runTasks({
    threads: threadCount,
    taskName: 'processTexture',
    tasks: textures.map((texture) => {
      return {
        inputDir: inputDir,
        outputDir: convertDir,
        texture: texture,
        update: update === 'all',
        texSize: textureSize,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 2/3: Copy materials')
  logger.verbose(verbose)

  await runTasks<'copyMaterial'>({
    taskName: 'copyMaterial',
    tasks: materials.map((file) => {
      return {
        inputDir: inputDir,
        outputDir: convertDir,
        material: file,
        update: update,
      }
    }),
  })

  logger.verbose(true)
  logger.info('Step 3/3: Generate models')
  logger.verbose(verbose)
  await runTasks({
    threads: threadCount,
    taskName: 'processModel',
    tasks: assets.map((asset) => {
      return {
        ...asset,
        inputDir,
        convertDir,
        outputDir,
        update: update === 'all' || update === 'models',
        binary,
        webp,
        draco,
        embed,
        ktx,
      }
    }),
  })

  writeAssets({ assets, outputDir })
}

async function selectTextures({ sourceRoot, assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    const mtlTags = new CaseInsensitiveSet<string>()
    const texTags = new CaseInsensitiveSet<string>()
    for (const mesh of asset.meshes) {
      const mtl = await loadMtlFile(path.join(sourceRoot, mesh.material))
      for (const it of mtl) {
        mtlTags.add(it.Shader)
        const textures = getMtlTextures(it) || []
        for (const texture of textures) {
          texTags.add(texture.Map)
          result.add(replaceExtname(texture.File, '.dds'))
        }
      }
    }
    Object.assign(asset, {
      _shaders: Array.from(mtlTags.values()).filter((it) => !!it),
      _textures: Array.from(texTags.values()).filter((it) => !!it),
    })
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

async function debugCollection(options: ConvertModelsOptions) {
  const shaders = new CaseInsensitiveMap<string, number>()
  const features = new CaseInsensitiveMap<string, number>()
  await withProgressBar({ tasks: options.assets }, async (asset, i, log) => {
    for (const mesh of asset.meshes) {
      const file = mesh.material
      if (!file) {
        continue
      }
      const doc = await readMtlFile(path.join(options.inputDir, file))
      const materials = getSubMaterials(doc?.Material)
      for (const material of materials) {
        if (shaders.has(material.Shader)) {
          shaders.set(material.Shader, shaders.get(material.Shader) + 1)
        } else {
          shaders.set(material.Shader, 1)
        }
        const ftr = (material.StringGenMask || '').split('%').filter((it) => it)
        for (const it of ftr) {
          if (features.has(it)) {
            features.set(it, features.get(it) + 1)
          } else {
            features.set(it, 1)
          }
        }
        // if (material.Shader?.toLowerCase() === 'humanskin') {
        //   console.log('humanskin', mesh.model)
        // }
        if (material.Shader?.toLowerCase() === 'fxmeshadvanced') {
          console.log('fxmeshadvanced', mesh.model)
        }
      }
    }
  })

  console.log(Object.fromEntries(shaders.entries()))
  console.log(Object.fromEntries(features.entries()))
}
