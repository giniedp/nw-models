import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'

export async function readLevelDataActionFile(file: string): Promise<LevelDataActionDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseLevelDataActionFile(data)
}

export function parseLevelDataActionFile(data: string): LevelDataActionDocument {
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

export interface LevelDataActionDocument {
  LevelDataAction: LevelDataActionNode
}

export interface LevelDataActionNode {
  Missions: {
    Mission: MissionNode[]
  }
}

export interface MissionNode {
  Name: string
  File: string
  CGFCount: number
  ProgressBarRange: number
}
