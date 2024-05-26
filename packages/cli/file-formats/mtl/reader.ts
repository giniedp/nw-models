import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../../utils'
import { MtlDocument, MtlObject } from './types'
import { getMaterialList, getMaterialTextures, resolveMtlTexturePath } from './utils'

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

export async function loadMtlFile(file: string, options: {
  inputDir: string
  catalog: Record<string, string>
}): Promise<MtlObject[]> {
  file = path.resolve(options.inputDir, file)
  if (!fs.existsSync(file)) {
    logger.warn(`Material does not exist: ${file}`)
    return null
  }
  const doc = await readMtlFile(file)
  const materials = getMaterialList(doc?.Material)
  for (const mtl of materials) {
    for (const tex of getMaterialTextures(mtl)) {
      if (!tex.File) {
        continue
      }
      tex.File = resolveMtlTexturePath(tex, {
        inputDir: options.inputDir,
        catalog: options.catalog
      }) || tex.File
    }
  }
  return materials
}
