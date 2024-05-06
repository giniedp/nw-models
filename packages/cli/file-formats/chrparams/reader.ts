import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import * as path from 'path'

export interface Animation {
  name: string
  path: string
}

export interface Joint {
  name: string
}

export type ChrParams = {
  Model: {
    File: string
  }
  AnimationList: {
    Animation: Animation | Array<Animation>
  }
  BBoxIncludeList: {
    Joint: Joint | Array<Joint>
  }
}
export type ChrParamsFile = {
  Params: ChrParams
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

export async function readChrParams(file: string) {
  const data = await fs.promises.readFile(file, 'utf-8')
  return parseChrParams(data)
}

export function parseChrParams(data: string) {
  return (parser.parse(data) as ChrParamsFile).Params
}

export function getChrParamsAnimationGlobs(params: ChrParams, rootDir: string) {
  const result: string[] = []
  let filePath: string = null
  for (const animation of toArray(params.AnimationList.Animation)) {
    if (animation.name === '#filepath') {
      filePath = animation.path
      continue
    }
    if (animation.path.endsWith('.caf') && filePath) {
      result.push(path.join(rootDir, filePath, animation.path))
    }
  }
  return result
}

function toArray<T>(it: T | T[]) {
  return Array.isArray(it) ? it : [it]
}
