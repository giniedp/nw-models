import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'
import { replaceExtname } from '../utils/file-utils'

export function fixMtlPath({
  sourceDir,
  mtlFile,
  mtlFileFallback,
  logTag,
}: {
  sourceDir: string
  mtlFile: string
  mtlFileFallback?: string
  logTag: string
}) {
  if (!mtlFile) {
    mtlFile = mtlFileFallback
  }
  if (!mtlFile) {
    return null
  }

  for (const file of [mtlFile, mtlFileFallback]) {
    if (!file) {
      continue
    }
    if (fs.existsSync(path.join(sourceDir, file))) {
      return file
    }
    // materials are sometimes referenced wrongly
    // - objects\weapons\melee\spears\2h\spearisabella\textures\wep_mel_spr_2h_spearisabella_matgroup.mtl
    // should be
    // - objects\weapons\melee\spears\2h\spearisabella\wep_mel_spr_2h_spearisabella_matgroup.mtl
    const candidate = path.join(path.dirname(file), '..', path.basename(file))
    if (file.includes('textures') && fs.existsSync(path.join(sourceDir, candidate))) {
      return candidate
    }
  }

  logger.warn('missing material', mtlFile, `(${logTag})`)
  return null
}

export function fixModelPath(sourceDir: string, modelFile: string, logTag: string) {
  if (!modelFile) {
    return null
  }
  // HINT: .cloth files are not model files
  if (path.extname(modelFile) === '.cloth') {
    const skinFile = replaceExtname(modelFile, '.skin')
    if (fs.existsSync(path.join(sourceDir, skinFile))) {
      return skinFile
    }
    return null
  }

  if (fs.existsSync(path.join(sourceDir, modelFile))) {
    return modelFile
  }
  logger.warn('missing model', modelFile, `(${logTag})`)
  return null
}
