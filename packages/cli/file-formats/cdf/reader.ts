import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import { z } from 'zod'

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
export type CharacterDefinition = {
  Model: {
    File: string
  }
  AttachmentList: {
    Attachment: Attachment | Array<Attachment>
  }
}
export type CharacterDefinitionFile = {
  CharacterDefinition: CharacterDefinition
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

export async function readCdf(file: string) {
  const data = await fs.promises.readFile(file, 'utf-8')
  return parseCdf(data)
}

export function parseCdf(data: string) {
  return (parser.parse(data) as CharacterDefinitionFile).CharacterDefinition
  // console.log(jObj)
  // return jObj
  // if (!jObj) {
  //   return null
  // }

  // if (Array.isArray(jObj.AttachmentList.Attachment)) {
  //   const attachments =
  //     jObj.AttachmentList.Attachment.find((attachment) => attachment.Type === 'CA_CLOTH' && attachment.Binding) ||
  //     jObj.AttachmentList.Attachment.find((attachment) => attachment.Type === 'CA_SKIN')
  //   if (attachments.Binding.includes('.cloth')) {
  //     attachments.Binding = attachments.Binding.replace('.cloth', '.skin')
  //     attachments.Binding = attachments.Binding.replaceAll('var1', '')
  //   }
  //   return {
  //     model: attachments.Binding,
  //     material: attachments.Material,
  //   }
  // } else {
  //   return {
  //     model: jObj.AttachmentList.Attachment.Binding,
  //     material: jObj.AttachmentList.Attachment.Material,
  //   }
  // }
}

export async function getModelsFromCdf(file: string) {
  const doc = await readCdf(file)
  return toArray(doc.AttachmentList.Attachment)
    .filter((it) => !!it)
    .filter((it) => {
      return it.Type === 'CA_CLOTH' || it.Type === 'CA_SKIN'
    })
    .map((it: SkinAttachment | ClothAttachment) => {
      return {
        model: it.Binding,
        material: it.Material,
        name: it.AName,
        type: it.Type,
      }
    })
}

function toArray<T>(it: T | T[]) {
  return Array.isArray(it) ? it : [it]
}
