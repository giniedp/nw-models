import fs from 'node:fs'
import path from 'node:path'
import { replaceExtname } from '../../utils'
import { parseAssetUUID } from '../catalog/utils'
import { MtlObject, MtlTexture } from './types'

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
  if (!mtl || !(key in mtl)) {
    return null
  }
  const factor = Number(mtl[key])
  if (Number.isFinite(factor) && !Number.isNaN(factor)) {
    return factor
  }
  return null
}

export function getMaterialParamVec(mtl: MtlObject, key: keyof MtlObject) {
  if (!mtl || !(key in mtl) || !mtl[key]) {
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

export function resolveMtlTexturePath(
  tex: MtlTexture,
  options: {
    inputDir: string
    catalog: Record<string, string>
  },
): string {
  if (!tex?.File) {
    return null
  }

  let file = tex.File
  if (fs.existsSync(path.resolve(options.inputDir, file))) {
    return file
  }

  if (path.extname(file).match(/^\.\d+$/)) {
    // foo.dds.5 -> foo.dds
    file = replaceExtname(file, '')
  }
  if (file.endsWith('.dds.dds')) {
    file = file.replace(/\.dds$/, '')
  }

  file = replaceExtname(file, '.dds')
  if (fs.existsSync(path.resolve(options.inputDir, file))) {
    return file
  }

  const assetId = parseAssetUUID(tex.AssetId, {
    normalize: true,
  })
  if (!assetId) {
    return null
  }

  file = options.catalog[assetId]
  if (!file) {
    return null
  }
  if (path.extname(file).match(/^\.\d+$/)) {
    // foo.dds.5 -> foo.dds
    file = replaceExtname(file, '')
  }
  if (fs.existsSync(path.resolve(options.inputDir, file))) {
    return file
  }

  file = replaceExtname(file, '.dds')
  if (fs.existsSync(path.resolve(options.inputDir, file))) {
    return file
  }

  return null
}


export function getMaterialList(mtl: MtlObject): MtlObject[] {
  if (!mtl) {
    return []
  }
  if (!mtl.SubMaterials) {
    return [mtl]
  }
  if (mtl.SubMaterials && typeof mtl.SubMaterials === 'object' && mtl.SubMaterials.Material) {
    const subMaterials = mtl.SubMaterials.Material
    if (Array.isArray(subMaterials)) {
      return [...subMaterials]
    }
    if (subMaterials) {
      return [subMaterials]
    }
  }
  return []
}
