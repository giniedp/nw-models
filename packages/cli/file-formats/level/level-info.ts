import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'

export async function readLevelInfoFile(file: string): Promise<LevelInfoDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseLevelInfoFile(data)
}

export function parseLevelInfoFile(data: string): LevelInfoDocument {
  const parser = new XMLParser({
    preserveOrder: false,
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (nodeName: string) => {
      if (nodeName === 'Mission') {
        return true
      }
      return false
    },
  })
  return parser.parse(data)
}

export interface LevelInfoDocument {
  LevelInfo: LevelInfoNode
}

export interface LevelInfoNode {
  SandboxVersion: string
  Name: string
  HeightmapSize: number
  TerrainInfo: TerrainInfoNode
  Missions: {
    Mission: MissionNode[]
  }
}

export interface MissionNode {
  Name: string
}

export interface TerrainInfoNode {
  HeightmapSize: number
  UnitSize: number
  SectorSize: number
  SectorsTableSize: number
  HeightmapZRatio: number
  OceanWaterLevel: number
}
