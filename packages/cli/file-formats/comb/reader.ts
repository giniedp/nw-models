import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import { CombDocument } from './types'

const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

export async function readCombFile(file: string): Promise<CombDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseCombFile(data)
}

export function parseCombFile(data: string): CombDocument {
  return parser.parse(data)
}
