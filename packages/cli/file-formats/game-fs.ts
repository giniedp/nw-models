import { existsSync } from 'fs'
import path from 'path'
import { glob, readJsonFile, replaceExtname } from '../utils/file-utils'
import { logger } from '../utils/logger'
import { readCdf } from './cdf'
import { getMaterialNameForSkin, getSkinFromCloth, readCgf } from './cgf'
import { readMtlFile } from './mtl'

export type GameFileSystem = ReturnType<typeof gameFileSystem>
export function gameFileSystem(rootDir: string) {
  const pathTo = (...paths: string[]) => path.resolve(path.join(rootDir, ...paths))

  const gfs = {
    rootDir: rootDir,
    absolute: pathTo,
    extname: path.extname,
    dirname: path.dirname,
    basename: path.basename,
    existsSync: (file: string) => existsSync(pathTo(file)),
    glob: async (pattern: string[]) => {
      return glob(pattern.map((it) => pathTo(it))).then((files) => {
        return files.map((file) => path.relative(rootDir, file))
      })
    },
    readJson: (file: string) => readJsonFile(pathTo(file)),
    readCgf: (file: string) => readCgf(pathTo(file)),
    readCdf: (file: string) => readCdf(pathTo(file)),
    readMtl: (file: string) => readMtlFile(pathTo(file)),
    resolveTexturePath: (file: string) => resolveTexturePath(gfs, file),
    resolveModelPath: (file: string) => resolveModelPath(gfs, file),
    resolveMaterialPath: (file: string | string[]) => resolveMaterialPath(gfs, file),
    resolveMaterialForModel: (file: string) => resolveMaterialForModel(gfs, file),
    defaults: {
      mtl: 'materials/references/base_colors/purple_trans_glowing.mtl',
    },
  }
  return gfs
}

export function resolveTexturePath(gfs: GameFileSystem, file: string) {
  if (!file) {
    return null
  }
  if (gfs.existsSync(file)) {
    return file
  }

  const candidates = [
    file,
    path.join(path.dirname(file), '..', 'textures', path.basename(file)),
    path.join(path.dirname(file), 'textures', path.basename(file)),
    path.join(path.dirname(file), path.basename(file).replace('horsemount_pattern', 'mount_horse_pattern')),
  ]
  for (const candidate of candidates) {
    if (gfs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function resolveModelPath(gfs: GameFileSystem, file: string) {
  if (!file) {
    return null
  }
  const extname = gfs.extname(file).toLowerCase()
  const exists = gfs.existsSync(file)
  if (extname === '.cgf' && exists) {
    return file
  }
  if (extname === '.skin' && exists) {
    return file
  }
  if (extname === '.cloth') {
    const skin = getSkinFromCloth(gfs.absolute(file))
    if (skin) {
      return skin
    }
    logger.warn('no skin found in', file)
    return null
  }

  if (exists) {
    return file
  }
  return null
}

export async function resolveMaterialPath(gfs: GameFileSystem, file: string | string[]): Promise<string> {
  if (!file || !file.length) {
    return null
  }
  file = Array.isArray(file) ? file : [file]

  for (const current of file) {
    if (!current) {
      continue
    }
    if (gfs.existsSync(current)) {
      return current
    }
    // materials are sometimes referenced wrongly
    // - objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
    // should be
    // - objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
    const candiates = await gfs.glob([gfs.dirname(current) + '/**/' + gfs.basename(current)])
    if (candiates.length) {
      return candiates[0]
    }
  }

  return null
}

export async function resolveMaterialForModel(gfs: GameFileSystem, model: string): Promise<string> {
  if (!model || !gfs.existsSync(model)) {
    return null
  }

  const material = await getMaterialNameForSkin(gfs.absolute(model))
  if (material?.file && gfs.existsSync(material.file)) {
    return material.file
  }

  if (material?.assetId) {
    // TODO: lookup in asset.catalog
  }

  if (material?.name) {
    // lookup by material name. Unsuccessfull so far. Especially for names like "T2"
  }

  // Just find a material near to current location and best match by path/file name
  const candidates = await gfs
    .glob([gfs.dirname(model) + '/**/*.mtl', gfs.dirname(model) + '/../*.mtl'])
    .then((files) => sortFilesByLevensteinDistance(model, files))

  if (candidates.length) {
    // logger.debug(candidates)
    return candidates[0]
  }
  return null
}

function sortFilesByLevensteinDistance(originFile: string, files: string[]) {
  return files
    .map((file) => {
      return {
        file: file,
        distance: levenshteinDistance(originFile, file),
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ file }) => file)
}

function sortFilesByRelativeDistance(originFile: string, files: string[]) {
  const depth1 = getFileDepth(originFile)
  const result = files
    .map((file) => ({
      file: file,
      depth: getFileDepth(file),
    }))
    .map(({ file, depth }) => {
      return {
        file: file,
        distance: Math.abs(depth1 - depth),
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ file }) => file)
  return result
}

function getFileDepth(file: string) {
  return file.replace(/\\/gi, '/').split('/').length
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  // Create a 2D array to store the distances
  const distances: number[][] = []

  // Initialize the first row and first column
  for (let i = 0; i <= len1; i++) {
    distances[i] = []
    for (let j = 0; j <= len2; j++) {
      if (i === 0) {
        distances[i][j] = j
      } else if (j === 0) {
        distances[i][j] = i
      } else {
        // Calculate the minimum of the three possible operations
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        distances[i][j] = Math.min(
          distances[i - 1][j] + 1, // Deletion
          distances[i][j - 1] + 1, // Insertion
          distances[i - 1][j - 1] + cost, // Substitution
        )
      }
    }
  }

  return distances[len1][len2]
}
