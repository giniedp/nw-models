import fs from 'fs'
import path from 'path'
import { glob } from '../utils/file-utils'
import { logger } from '../utils/logger'
import { readCgfMaterialName } from './cgf'
import { readClothGeometryReferences } from './cloth'

export const DEFAULT_MATERIAL = 'materials/references/base_colors/purple_trans_glowing.mtl'

export function resolveAbsoluteTexturePath(file: string, options: { inputDir: string }) {
  if (!file) {
    return null
  }
  file = file.replace(/\\/g, '/').toLocaleLowerCase()
  if (file.startsWith('/objects/')) {
    file = file.replace('/objects/', 'objects/')
  }
  const candidates = [
    file,
    path.join(path.dirname(file), '..', 'textures', path.basename(file)),
    path.join(path.dirname(file), 'textures', path.basename(file)),
    path.join(path.dirname(file), path.basename(file).replace('horsemount_pattern', 'mount_horse_pattern')),
  ]
  for (let candidate of candidates) {
    candidate = path.resolve(options.inputDir, candidate).replace(/\\/g, '/').toLocaleLowerCase()
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function resolveCgfPath(file: string, options: { inputDir: string }) {
  if (!file) {
    return null
  }
  const modelFile = path.resolve(options.inputDir, file)
  const extname = path.extname(modelFile)
  const exists = fs.existsSync(modelFile)
  if (extname === '.cgf' && exists) {
    return file
  }
  if (extname === '.skin' && exists) {
    return file
  }
  if (extname === '.cloth') {
    const skin = readClothGeometryReferences(modelFile)
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

export async function resolveMtlPath(fileOrFiles: string | string[], options: { inputDir: string }): Promise<string> {
  if (!fileOrFiles || !fileOrFiles.length) {
    return null
  }
  fileOrFiles = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]

  for (let file of fileOrFiles) {
    if (!file) {
      continue
    }
    const mtlFile = path.resolve(options.inputDir, file)
    if (fs.existsSync(mtlFile)) {
      return file
    }
    // materials are sometimes referenced wrongly
    // - objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
    // should be
    // - objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
    const candiates = await glob([path.dirname(mtlFile) + '/**/' + path.basename(mtlFile)])
    if (candiates.length) {
      return path.relative(options.inputDir, candiates[0])
    }
  }

  return null
}

export async function resolveMtlFromCgf(
  model: string,
  options: {
    inputDir: string
    catalog: Record<string, string>
  },
): Promise<string> {
  if (!model) {
    return null
  }
  model = path.resolve(options.inputDir, model)

  const mtl = await readCgfMaterialName(model)

  // if (mtl?.file && fs.existsSync(material.file)) {
  //   return material.file
  // }
  const assetId = normalizeUUID(mtl?.assetId)
  if (assetId && options.catalog?.[assetId]) {
    return options.catalog[assetId]
  }

  if (mtl?.name) {
    // lookup by material name. Unsuccessfull so far. Especially for names like "T2"
  }

  // Just find a material near to current location and best match by path/file name
  const mtlSearch = [path.dirname(model) + '/**/*.mtl', path.dirname(model) + '/../*.mtl']
  const candidates = await glob(mtlSearch).then((files) => sortFilesByLevensteinDistance(model, files))

  if (candidates.length) {
    // logger.debug(candidates)
    return path.relative(options.inputDir, candidates[0])
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
function normalizeUUID(uuid: string) {
  if (!uuid) {
    return null
  }
  return uuid.replaceAll('{', '').replaceAll('}', '').replace(/-/g, '').toLowerCase()
}
