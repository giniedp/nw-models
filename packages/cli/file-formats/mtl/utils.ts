import { MtlObject, MtlTexture } from './types'

export function getMaterial(list: MtlObject[], name: string) {
  if (list?.length === 1) {
    return list[0]
  }
  return list.find((it) => it.Name.toLowerCase() === name.toLowerCase())
}

export function getMaterialTextures(mtl: MtlObject): MtlTexture[] {
  if (!mtl || !mtl.Textures) {
    return []
  }
  if (typeof mtl.Textures !== 'object') {
    return []
  }
  if (Array.isArray(mtl.Textures.Texture)) {
    return mtl.Textures.Texture
  }
  if (mtl.Textures.Texture) {
    return [mtl.Textures.Texture]
  }
  return []
}

export function getMaterialParamNum(mtl: MtlObject, key: keyof MtlObject) {
  if (!(key in mtl)) {
    return null
  }
  const factor = Number(mtl[key])
  if (Number.isFinite(factor) && !Number.isNaN(factor)) {
    return factor
  }
  return null
}

export function getMaterialParamVec(mtl: MtlObject, key: keyof MtlObject) {
  if (!(key in mtl) || !mtl[key]) {
    return null
  }
  const factor = String(mtl[key])
    .split(',')
    .map((it) => Number(it))
  if (factor.every((it) => Number.isFinite(it) && !Number.isNaN(it))) {
    return factor
  }
  return null
}
