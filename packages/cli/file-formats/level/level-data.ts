import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'

export async function readLevelDataFile(file: string): Promise<LevelDataDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseLevelDataFile(data)
}

export function parseLevelDataFile(data: string): LevelDataDocument {
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

export interface LevelDataDocument {
  LevelData: LevelDataNode
}

export interface LevelDataNode {
  LevelInfo: LevelInfo
}

export interface LevelInfo {
  CreationDate: string
  HeightmapSize: number
  HeightmapUnitSize: number
  HeightmapMaxHeight: number
  WaterLevel: number
  TerrainSectorSizeInMeters: number
}
