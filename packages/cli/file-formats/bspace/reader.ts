import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import { BspceDocument } from './types'

const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

export async function readBspaceFile(file: string): Promise<BspceDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseBspaceFile(data)
}

export function parseBspaceFile(data: string): BspceDocument {
  return parser.parse(data)
}
