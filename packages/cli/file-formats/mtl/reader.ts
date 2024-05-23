import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import { logger } from '../../utils'
import { MtlDocument, MtlObject } from './types'

export async function loadMtlFile(mtlFile: string): Promise<MtlObject[]> {
  if (!fs.existsSync(mtlFile)) {
    logger.warn(`Material does not exist: ${mtlFile}`)
    return null
  }
  const doc = await readMtlFile(mtlFile)
  return getSubMaterials(doc?.Material)
}

export async function readMtlFile(file: string): Promise<MtlDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseMtlFile(data)
}

export function parseMtlFile(data: string): any {
  const parser = new XMLParser({
    preserveOrder: false,
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
  })
  return parser.parse(data)
}

export function getSubMaterials(mtl: MtlObject): MtlObject[] {
  if (!mtl) {
    return []
  }
  if (!mtl.SubMaterials) {
    return [mtl]
  }
  if (mtl.SubMaterials && typeof mtl.SubMaterials === 'object' && mtl.SubMaterials.Material) {
    const subMaterials = mtl.SubMaterials.Material
    if (Array.isArray(subMaterials)) {
      return [...subMaterials]
    }
    if (subMaterials) {
      return [subMaterials]
    }
  }
  return []
}
