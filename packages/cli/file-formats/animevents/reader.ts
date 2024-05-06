import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'

export type AnimeventsDocument = {
  anim_event_list: AnimEventList
}

export type AnimEventList = {
  animation: AnimEventListEntry | Array<AnimEventListEntry>
}

export interface AnimEventListEntry {
  name: string
  event: AnimEvent | Array<AnimEvent>
}

export interface AnimEvent {
  name: string
  time: string
  endTime: string
  parameter: string
  bone: string
  secondBone: string
  offset: string
  dir: string
  model: string
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

export async function readAnimevents(filePath: string) {
  const data = await fs.promises.readFile(filePath, 'utf-8')
  return parseAnimevents(data)
}

export function parseAnimevents(data: string) {
  const doc = parser.parse(data) as AnimeventsDocument
  return toArray(doc?.anim_event_list?.animation)
}

function toArray<T>(it: T | T[]) {
  if (!it) {
    return []
  }
  return Array.isArray(it) ? it : [it]
}
