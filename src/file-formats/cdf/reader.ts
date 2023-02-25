import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'

const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

export interface CdfObject {

}

export async function readCdf(file: string) {
  const data = await fs.promises.readFile(file, 'utf-8')
  return parseCdf(data)
}

export function parseCdf(data: string) {
  const jObj = parser.parse(data).CharacterDefinition

  if (Array.isArray(jObj.AttachmentList.Attachment)) {
    const attachments = jObj.AttachmentList.Attachment.find((attachment) => attachment.Type === 'CA_SKIN')
    return {
      model: attachments.Binding,
      material: attachments.Material,
    }
  } else {
    return {
      model: jObj.AttachmentList.Attachment.Binding,
      material: jObj.AttachmentList.Attachment.Material,
    }
  }
}