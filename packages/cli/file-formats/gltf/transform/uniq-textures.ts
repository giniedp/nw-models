import { Document, Texture } from '@gltf-transform/core'
import { PBRSpecularGlossiness } from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import { BinaryLike, createHash } from 'crypto'
import { NwAppearanceProperties } from '../extensions/properties'

const NAME = 'uniqTextures'
export function uniqTextures() {
  return createTransform(NAME, (doc: Document) => {
    const logger = doc.getLogger()
    const startAt = process.hrtime.bigint()
    const textures = doc
      .getRoot()
      .listTextures()
      .map((texture) => {
        return {
          texture: texture,
          hash: getHash(texture),
        }
      })
      .sort((a, b) => a.hash.localeCompare(b.hash))

    for (const { texture, hash } of textures) {
      logger.debug(`${NAME}: ${hash} | ${texture.getName()}`)
    }

    doc
      .getRoot()
      .listMaterials()
      .forEach((mat) => {
        let tex: Texture
        if ((tex = mat.getNormalTexture())) {
          mat.setNormalTexture(remapTexture(tex, textures))
        }
        if ((tex = mat.getOcclusionTexture())) {
          mat.setOcclusionTexture(remapTexture(tex, textures))
        }
        if ((tex = mat.getEmissiveTexture())) {
          mat.setEmissiveTexture(remapTexture(tex, textures))
        }
        if ((tex = mat.getBaseColorTexture())) {
          mat.setBaseColorTexture(remapTexture(tex, textures))
        }
        if ((tex = mat.getMetallicRoughnessTexture())) {
          mat.setMetallicRoughnessTexture(remapTexture(tex, textures))
        }
        mat.listExtensions().forEach((ext) => {
          if (ext instanceof PBRSpecularGlossiness) {
            if ((tex = ext.getSpecularGlossinessTexture())) {
              ext.setSpecularGlossinessTexture(remapTexture(tex, textures))
            }
            if ((tex = ext.getDiffuseTexture())) {
              ext.setDiffuseTexture(remapTexture(tex, textures))
            }
          }
          if (ext instanceof NwAppearanceProperties) {
            if ((tex = ext.getMaskTexture())) {
              ext.setMaskTexture(remapTexture(tex, textures))
            }
          }
        })
      })
    const endAt = process.hrtime.bigint()
    logger.debug(`${NAME}: Complete ${Number(endAt - startAt) / 1e6}ms`)
  })
}

function getHash(tex: Texture) {
  const image = tex.getImage()
  if (image) {
    return getMd5(image)
  }
  const uri = tex.getURI()
  if (uri) {
    return getMd5(uri)
  }
  return null
}

function getMd5(content: BinaryLike) {
  return createHash('md5').update(content).digest('hex')
}

function remapTexture(texture: Texture, candidates: Array<{ texture: Texture; hash: string }>) {
  if (!texture) {
    return null
  }
  const hash = candidates.find((it) => it.texture === texture)?.hash
  if (!hash) {
    return texture
  }
  const found = candidates.find((it) => it.hash === hash)?.texture
  if (!found || found === texture) {
    return texture
  }
  texture.dispose()
  return found
}
