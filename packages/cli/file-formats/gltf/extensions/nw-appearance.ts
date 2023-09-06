import { Document, Texture, vec3, vec4 } from '@gltf-transform/core'
import { KHRMaterialsPBRSpecularGlossiness, PBRSpecularGlossiness } from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import {
  MtlObject,
  getMaterial,
  getMaterialParamNum,
  getMaterialParamVec,
  getMaterialTextures,
} from '../../../file-formats/mtl'
import * as fs from 'fs'
import { Appearance, getAppearanceId } from '../../../types'
import { replaceExtname } from '../../../utils/file-utils'
import { NwAppearanceExtension } from './nw-appearance-extension'
import { blendDiffuseMap, blendSpecularMap, hexToRgb, mergeSpecularGloss, rgbToHex, textureCache } from './utils'
import { isFinite, isNumber } from 'lodash'

export interface NwAppearanceOptions {
  materials: MtlObject[]
  appearance: Appearance
  bake: boolean
}

export function nwAppearance(options: NwAppearanceOptions) {
  return createTransform('nw-appearance', async (doc: Document) => {
    await transformMaterials(doc, options)
  })
}

async function transformMaterials(doc: Document, { appearance, materials, bake }: NwAppearanceOptions) {
  const logger = doc.getLogger() as typeof console
  const root = doc.getRoot()
  if (!root.listMaterials()?.length) {
    return
  }

  const cache = textureCache(doc)

  for (const material of root.listMaterials()) {
    const materialIndex = root.listMaterials().indexOf(material)
    logger.debug(`MATERIAL ${materialIndex}: ${material.getName()}`)

    const mtl = getMaterial(materials, material.getName())
    const mtlDiffuse = getMaterialParamVec(mtl, 'Diffuse')
    const mtlSpecular = getMaterialParamVec(mtl, 'Specular')
    const mtlEmissive = getMaterialParamVec(mtl, 'Emissive')
    const mtlEmittance = getMaterialParamVec(mtl, 'Emittance')
    const mtlOpacity = getMaterialParamNum(mtl, 'Opacity')
    const mtlAlphaTest = getMaterialParamNum(mtl, 'AlphaTest')
    const mtlShininess = getMaterialParamNum(mtl, 'Shininess')
    const mtlTextures = getMaterialTextures(mtl) || []

    // The diffuse color texture. All models should have this
    const mapDiffuse = mtlTextures.find((it) => it.Map === 'Diffuse')
    // Bumpmap and Smoothness are the same texture
    // - rgb -> Bumpmap
    // - a -> Smoothness
    const mapBumpmap = mtlTextures.find((it) => it.Map === 'Bumpmap')
    let mapSmoothness = mtlTextures.find((it) => it.Map === 'Smoothness')
    // Metal Materials have a specular map applied
    const mapSpecular = mtlTextures.find((it) => it.Map === 'Specular')
    // Custom color mask (dye color?)
    const mapCustom = mtlTextures.find((it) => it.Map === 'Custom')
    // Items that glow have an emit color map
    const mapEmittance = mtlTextures.find((it) => it.Map === 'Emittance')
    const mapOpacity = mtlTextures.find((it) => it.Map === 'Opacity')

    logger.debug(`mtlDiffuse`, mtlDiffuse)
    logger.debug(`mtlSpecular`, mtlSpecular)
    logger.debug(`mtlEmissive`, mtlEmissive)
    logger.debug(`mtlEmittance`, mtlEmittance)
    logger.debug(`mtlOpacity`, mtlOpacity)
    logger.debug(`mtlAlphaTest`, mtlAlphaTest)
    logger.debug(`mtlShininess`, mtlShininess)
    logger.debug(`mapDiffuse ${mapDiffuse?.File}`)
    logger.debug(`mapBumpmap ${mapBumpmap?.File}`)
    logger.debug(`mapSmoothness ${mapSmoothness?.File}`)
    logger.debug(`mapSpecular ${mapSpecular?.File}`)
    logger.debug(`mapCustom ${mapCustom?.File}`)
    logger.debug(`mapEmit ${mapEmittance?.File}`)

    if (mtlDiffuse && mtlDiffuse.length === 4) {
      material.setBaseColorFactor(mtlDiffuse as vec4)
    }

    if (!mapSmoothness && mapBumpmap) {
      logger.debug('use mapBumpmap as mapSmoothness')
      mapSmoothness = mapBumpmap
    }

    let texDiffuse: Texture
    if (mapCustom?.File && mapDiffuse?.File && bake && appearance) {
      const key = `${getAppearanceId(appearance)}-${mapDiffuse.File}-${mapCustom.File}}`.toLowerCase()
      texDiffuse = await cache
        .addTexture(key, async () => {
          return {
            name: mapDiffuse.Map,
            mime: 'image/png',
            data: await blendDiffuseMap({
              base: mapDiffuse.File,
              mask: mapCustom.File,
              appearance: appearance,
            }),
          }
        })
        .catch((err) => {
          logger.error(`failed to blend diffuse map\n\t${mapDiffuse.File}\n\t${mapCustom.File}\n`, err)
          return null
        })
    }
    if (!texDiffuse && mapDiffuse?.File) {
      const file = `${mapDiffuse.File}`.toLowerCase()
      texDiffuse = await cache.addTextureFromFile(file, mapDiffuse.Map).catch((err) => {
        logger.error(`failed to read diffuse map\n\t${mapDiffuse.File}\n`, err)
        return null
      })
    }
    if (texDiffuse) {
      material.setMetallicFactor(0)
      material.setBaseColorTexture(texDiffuse)
    }

    if (mapBumpmap?.File) {
      const key = `${mapBumpmap.File}`.toLowerCase()
      const tex = await cache.addTextureFromFile(key, mapBumpmap.Map)
      material.setNormalTexture(tex)
      material.setNormalScale(1)
    }

    let texSpecular: Texture = null
    if (mapSpecular?.File && mapCustom?.File && bake && appearance) {
      const key = `${getAppearanceId(appearance)}-${mapSpecular.File}-${mapCustom.File}`.toLowerCase()
      texSpecular = await cache
        .addTexture(key, async () => {
          return {
            name: mapSpecular.Map,
            mime: 'image/png',
            data: await blendSpecularMap({
              base: mapSpecular?.File,
              mask: mapCustom.File,
              appearance: appearance,
            }),
          }
        })
        .catch((err) => {
          logger.error(`failed to blend specular map\n\t${mapSpecular.File}\n\t${mapCustom.File}\n`, err)
          return null
        })
    }
    if (!texSpecular && mapSpecular?.File) {
      const key = `${mapSpecular.File}`.toLowerCase()
      texSpecular = await cache.addTextureFromFile(key, mapSpecular.Map).catch((err) => {
        logger.error(`failed to read specular map\n\t${mapSpecular.File}\n`, err)
        return null
      })
    }

    if (texSpecular) {
      if (mapSmoothness && fs.existsSync(replaceExtname(mapSmoothness.File, '.a.png'))) {
        const glossFile = replaceExtname(mapSmoothness.File, '.a.png')
        const key = `${cache.getKey(texSpecular)}-${glossFile}`
        texSpecular = await cache
          .addTexture(key, async () => {
            return {
              name: mapSpecular.Map,
              mime: 'image/png',
              data: await mergeSpecularGloss({
                gloss: texSpecular.getImage(),
                spec: glossFile,
              }),
            }
          })
          .then((result) => {
            // TODO: write for debugging
            return result
          })
          .catch((err) => {
            logger.error(`failed to merge specular gloss\n\t${glossFile}\n`, err)
            return texSpecular
          })
      }

      const specExt = doc.createExtension(KHRMaterialsPBRSpecularGlossiness)
      specExt.setRequired(true)
      const specProps =
        material.getExtension<PBRSpecularGlossiness>(specExt.extensionName) || specExt.createPBRSpecularGlossiness()
      specProps.setDiffuseTexture(material.getBaseColorTexture())
      specProps.setSpecularGlossinessTexture(texSpecular)
      if (mtlSpecular && mtlSpecular.length >= 3) {
        specProps.setSpecularFactor(mtlSpecular.slice(0, 3) as vec3)
      }
      if (mtlDiffuse && mtlDiffuse.length === 4) {
        specProps.setDiffuseFactor(mtlDiffuse as vec4)
      }
      material.setExtension(specExt.extensionName, specProps)

      // need to remove the pbrMetallicRoughness, otherwise playcanvas would pick that up instead
      material.setMetallicRoughnessTexture(null)
      material.setBaseColorTexture(null)
      material.setMetallicFactor(1) // makes it not being added to pbrMetallicRoughness
      if (mtlShininess >= 0) {
        material.setRoughnessFactor(1 - mtlShininess / 255)
      }
    }

    if (mapEmittance) {
      const key = mapEmittance.File.toLowerCase()
      const texEmit = await cache.addTextureFromFile(key, mapEmittance.Map)
      material.setEmissiveTexture(texEmit)
      material.setEmissiveFactor([1, 1, 1])
    }

    if (appearance?.EmissiveColor) {
      // max value of EmissiveIntensity is 10
      logger.debug('EMISSIVE', appearance.EmissiveIntensity, appearance.EmissiveColor)
      const factor = (appearance.EmissiveIntensity || 0) / 10
      const color = hexToRgb(appearance.EmissiveColor, 1 / 255)
      material.setEmissiveFactor([color.r * factor, color.g * factor, color.b * factor])
    } else if (mtlEmittance && mtlEmittance.length >= 3) {
      mtlEmittance.length = 3
      material.setEmissiveFactor(mtlEmittance as vec3)
    } else if (mtlEmissive && mtlEmissive.length >= 3) {
      mtlEmissive.length = 3
      material.setEmissiveFactor(mtlEmissive as vec3)
    }

    material.setAlphaMode('OPAQUE')
    logger.debug('Alpha mode OPAQUE')
    if (isFinite(mtlAlphaTest) && mtlAlphaTest >= 0) {
      material.setAlphaCutoff(mtlAlphaTest)
      material.setAlphaMode('MASK')
      material.setDoubleSided(true)
    }
    if (isFinite(mtlOpacity) && mtlOpacity >= 0 && mtlOpacity < 1) {
      material.setAlpha(mtlOpacity)
      material.setAlphaMode('BLEND')
      material.setDoubleSided(true)
    }

    if (appearance && mapCustom?.File) {
      const extension = doc.createExtension(NwAppearanceExtension)
      extension.setRequired(false)
      const props = extension.createProps()
      props.setData({
        ...appearance,
      })
      if (mapCustom?.File) {
        const key = mapCustom.File.toLowerCase()
        const tex = await cache.addTextureFromFile(key, mapCustom.Map)
        props.setMaskTexture(tex)
      }
      material.setExtension(NwAppearanceExtension.EXTENSION_NAME, props)
    }
  }
}
