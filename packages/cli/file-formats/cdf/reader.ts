import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import { CharacterDefinitionDocument } from './types'

const arrayNodes: Record<string, boolean> = {
  CharacterDefinition: false,
  'CharacterDefinition.Model': false,
  'CharacterDefinition.AttachmentList': false,
  'CharacterDefinition.AttachmentList.Attachment': true,
}

export async function readCDF(file: string) {
  const data = await fs.promises.readFile(file, 'utf-8')
  return parseCDF(data)
}

export function parseCDF(data: string) {
  const parser = new XMLParser({
    preserveOrder: false,
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray(tagName, jPath, isLeafNode, isAttribute) {
      return isAttribute ? false : arrayNodes[jPath] ?? false
    },
  })
  return (parser.parse(data) as CharacterDefinitionDocument).CharacterDefinition
}
