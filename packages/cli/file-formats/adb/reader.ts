import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import { AnimDBDocument } from './types'

const ARRAY_TAGS = ['Fragment', 'AnimLayer', 'ProcLayer', 'Animation', 'Blend', 'Procedural', 'SubADB']
const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (tagName: string, jPath: string, isLeafNode: boolean, isAttribute: boolean) => {
    if (isAttribute) {
      return false
    }
    return ARRAY_TAGS.includes(tagName)
  },
})

export async function readAdbFile(file: string): Promise<AnimDBDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseAdbFile(data)
}

export function parseAdbFile(data: string): AnimDBDocument {
  return parser.parse(data)
}
