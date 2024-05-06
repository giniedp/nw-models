import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import * as path from 'path'
import { getChrParamsAnimationGlobs, readChrParams } from '../../file-formats/chrparams'
import { glob, replaceExtname } from '../../utils'

export type CharacterDefinitionDocument = {
  CharacterDefinition: CharacterDefinition
}
export type CharacterDefinition = {
  Model: {
    File: string
  }
  AttachmentList: AttachmentList
}
export interface AttachmentList {
  Attachment: Attachment | Array<Attachment>
}
export interface Attachment {
  Type: string
  AName: string
}

export interface SkinAttachment extends Attachment {
  Type: 'CA_SKIN'
  Binding: string
  Material: string
}
export interface ClothAttachment extends Attachment {
  Type: 'CA_CLOTH'
  Binding: string
  Material: string
}

const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

export async function readCDF(file: string) {
  const data = await fs.promises.readFile(file, 'utf-8')
  return parseCDF(data)
}

export function parseCDF(data: string) {
  return (parser.parse(data) as CharacterDefinitionDocument).CharacterDefinition
}

export function getCDFSkinsOrCloth(cdf: CharacterDefinition) {
  return toArray(cdf.AttachmentList.Attachment)
    .filter((it) => !!it)
    .filter((it) => it.Type === 'CA_CLOTH' || it.Type === 'CA_SKIN')
    .map((it: SkinAttachment) => {
      return {
        model: it.Binding,
        material: it.Material,
        name: it.AName,
        type: it.Type,
      }
    })
}

export async function getCDFAnimationFiles(cdf: CharacterDefinition, inputDir: string): Promise<string[]> {
  if (!cdf.Model || path.extname(cdf.Model.File).toLowerCase() !== '.chr') {
    return []
  }
  const chrFile = path.join(inputDir, cdf.Model.File)
  const chrParamsFile = replaceExtname(chrFile, '.chrparams')
  if (!fs.existsSync(chrParamsFile)) {
    return []
  }
  const chrParams = await readChrParams(chrParamsFile)
  const cafGlob = getChrParamsAnimationGlobs(chrParams, inputDir)
  const cafFiles = await glob(cafGlob)
  return cafFiles
}

export async function getModelsFromCdf(file: string) {
  const doc = await readCDF(file)
  return getCDFSkinsOrCloth(doc)
}

function toArray<T>(it: T | T[]) {
  if (!it) {
    return []
  }
  return Array.isArray(it) ? it : [it]
}
