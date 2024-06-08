import fs from 'node:fs'
import path from 'node:path'
import { glob, replaceExtname } from '../../utils'
import { BspceDocument, readBspaceFile } from '../bspace'
import { getChrParamsAnimationGlobs, readChrParamsFile } from '../chrparams'
import { readCombFile } from '../comb'
import { CombDocument } from '../comb/types'
import { readCDF } from './reader'
import { CharacterDefinition, ClothAttachment, SkinAttachment } from './types'

export function getCDFSkinsOrCloth(cdf: CharacterDefinition) {
  return toArray(cdf.AttachmentList.Attachment)
    .filter((it) => !!it)
    .filter((it) => it.Type === 'CA_CLOTH' || it.Type === 'CA_SKIN')
    .map((it: SkinAttachment | ClothAttachment) => {
      return {
        model: it.Binding,
        material: it.Material,
        name: it.AName,
        type: it.Type,
      }
    })
}

export type CdfAnimationFile = CdfAnimationFileCaf | CdfAnimationFileBspace | CdfAnimationFileComb

export interface CdfAnimationBase {
  name: string
  file: string
}
export interface CdfAnimationFileCaf extends CdfAnimationBase {
  type: 'caf'
}
export interface CdfAnimationFileBspace extends CdfAnimationBase {
  type: 'bspace'
  doc: BspceDocument
}
export interface CdfAnimationFileComb extends CdfAnimationBase {
  type: 'comb'
  doc: CombDocument
}

export async function getCDFAnimationFiles(
  cdf: CharacterDefinition,
  options: { inputDir: string },
): Promise<CdfAnimationFile[]> {

  if (!cdf.Model || path.extname(cdf.Model.File).toLowerCase() !== '.chr') {
    return []
  }
  const chrFile = path.resolve(options.inputDir, cdf.Model.File)
  const chrParamsFile = replaceExtname(chrFile, '.chrparams')
  if (!fs.existsSync(chrParamsFile)) {
    return []
  }
  const chrParams = await readChrParamsFile(chrParamsFile, options)
  const globPattern = getChrParamsAnimationGlobs(chrParams, options)

  const files = await glob(globPattern)
  const result: CdfAnimationFile[] = []
  for (const file of files) {
    const extname = path.extname(file)
    if (extname.toLowerCase() === '.caf') {
      result.push({
        type: 'caf',
        name: path.basename(file, extname),
        file,
      })
      continue
    }
    if (extname.toLowerCase() === '.bspace') {
      const doc = await readBspaceFile(file)
      result.push({
        type: 'bspace',
        name: path.basename(file, extname),
        file,
        doc,
      })
      continue
    }
    if (extname.toLowerCase() === '.comb') {
      const doc = await readCombFile(file)
      result.push({
        type: 'comb',
        name: path.basename(file, extname),
        file,
        doc,
      })
      continue
    }
  }
  return result
}

export async function getModelsFromCdf(file: string) {
  const doc = await readCDF(file)
  return getCDFSkinsOrCloth(doc)
}

export async function resolveCDFAsset(file: string, options: { inputDir: string, animations: boolean}) {
  const cdfFile = path.resolve(options.inputDir, file)
  const cdf = await readCDF(cdfFile)
  const animations = options.animations ? await getCDFAnimationFiles(cdf, options) : []
  const skins = getCDFSkinsOrCloth(cdf)
  return {
    file: cdfFile,
    model: cdf.Model.File,
    animations: animations,
    meshes: skins,
  }
}

function toArray<T>(it: T | T[]) {
  if (!it) {
    return []
  }
  return Array.isArray(it) ? it : [it]
}
