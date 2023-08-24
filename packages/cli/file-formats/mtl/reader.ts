import * as fs from 'fs'
import { XMLParser } from 'fast-xml-parser'
import { logger, toArray } from '../../utils'

export interface MaterialObject {
  attrs: Record<string, string>
  params: Record<string, string>
  textures: MaterialTexture[]
}

export interface MaterialTexture {
  Map: string
  File: string
}

export async function loadMtlFile(mtlFile: string): Promise<MaterialObject[]> {
  if (!fs.existsSync(mtlFile)) {
    logger.warn(`Material does not exist: ${mtlFile}`)
    return []
  }
  return readMtlFile(mtlFile)
}

export async function readMtlFile(file: string): Promise<MaterialObject[]> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseMtl(data)
}

export function parseMtl(data: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: 'attrs',
    attributeNamePrefix: '',
  })
  const doc = parser.parse(data)
  const material = doc.Material
  if (!material) {
    return []
  }
  if (!material.SubMaterials) {
    return [
      {
        attrs: material.attrs,
        textures: toArray(material.Textures?.Texture).map((it) => it.attrs),
        params: material.PublicParams?.attrs,
      },
    ]
  }
  return toArray(material.SubMaterials.Material).map((mtl): MaterialObject => {
    return {
      attrs: mtl.attrs,
      textures: toArray(mtl.Textures?.Texture).map((it) => it.attrs),
      params: mtl.PublicParams?.attrs,
    }
  })
}
