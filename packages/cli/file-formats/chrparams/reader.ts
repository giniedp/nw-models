import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'
import path from 'path'
import { Animation, ChrParams, ChrParamsDocument } from './types'

const parser = new XMLParser({
  preserveOrder: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

export type IncludeHandler = (file: string) => Promise<ChrParams>

export async function readChrParamsFile(file: string, options?: { inputDir: string }) {
  // logger.debug('readChrParamsFile', file)
  const data = await fs.promises.readFile(file, 'utf-8')
  let includeHandler: IncludeHandler = null
  if (options?.inputDir) {
    includeHandler = createIncludeHandler(options.inputDir, { knownFiles: [file] })
  }
  return parseChrParams(data, { includeHandler })
}

export async function parseChrParams(
  data: string,
  options: {
    includeHandler?: IncludeHandler
  },
) {
  const params = (parser.parse(data) as ChrParamsDocument).Params
  if (options.includeHandler) {
    await processInclude(params, options.includeHandler)
  }
  return params
}

function createIncludeHandler(inputDir: string, options?: { knownFiles: string[] }): IncludeHandler {
  const known = new Set<string>()
  options?.knownFiles?.forEach((file) => {
    known.add(path.normalize(file))
  })
  return async (file: string) => {
    const toInclude = path.normalize(path.resolve(inputDir, file))
    // logger.debug('include', toInclude)
    if (known.has(toInclude)) {
      throw new Error(`Circular include detected: ${toInclude}`)
    }
    known.add(toInclude)
    return readChrParamsFile(toInclude)
  }
}

async function processInclude(params: ChrParams, includeHandler: IncludeHandler) {
  let animation = params.AnimationList.Animation || []
  const result: Animation[] = []
  if (!Array.isArray(animation)) {
    animation = [animation]
  }
  for (const anim of animation) {
    if (anim.name !== '$Include') {
      result.push(anim)
      continue
    }
    const included = await includeHandler(anim.path)
    let includedAnims = included.AnimationList.Animation || []
    if (!Array.isArray(includedAnims)) {
      includedAnims = [includedAnims]
    }
    result.push(...includedAnims)
  }
  params.AnimationList.Animation = result
}
