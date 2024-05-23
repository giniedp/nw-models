import { Document, Texture, vec3, vec4 } from '@gltf-transform/core'
import {
  KHRMaterialsPBRSpecularGlossiness,
  KHRMaterialsTransmission,
  KHRTextureTransform,
  PBRSpecularGlossiness,
} from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import * as fs from 'fs'
import { isFinite } from 'lodash'
import {
  MtlObject,
  MtlShader,
  getMaterialParamNum,
  getMaterialParamVec,
  getMtlTextures,
} from '../../../file-formats/mtl'
import { Appearance } from '../../../types'
import { replaceExtname } from '../../../utils/file-utils'

import { getMtlObject } from '../utils/annotation'
import { mergeSpecularGloss } from '../utils/merge-specular-gloss'
import { textureCache } from '../utils/texture-cache'
import { NwAppearanceExtension } from './nw-appearance-extension'

export interface NwAppearanceOptions {
  appearance: Appearance
}

export function nwAppearance(options: NwAppearanceOptions) {
  return createTransform('nw-appearance', async (doc: Document) => {
    await transformMaterials(doc, options)
  })
}

async function transformMaterials(doc: Document, { appearance }: NwAppearanceOptions) {
  const logger = doc.getLogger() as typeof console
  const root = doc.getRoot()
  const debug = false
  if (!root.listMaterials()?.length) {
    return
  }

  // remove all meshes, that are drawn with the NoDraw shader
  const shadersToIgnore: MtlShader[] = [
    'NoDraw',
    'Nodraw',
    'GeometryBeam',
    'Geometrybeam',
    'GeometryBeamSimple',
    'Geometrybeamsimple',
    'Meshparticle',
  ]
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const shader = getMtlObject(prim.getMaterial())?.Shader
      if (shader && shadersToIgnore.includes(shader)) {
        prim.detach()
      }
    }
  }

  // remove all materials, that have the NoDraw shader
  for (const material of root.listMaterials()) {
    const shader = getMtlObject(material)?.Shader
    if (shader && shadersToIgnore.includes(shader)) {
      material.detach()
    }
  }

  const cache = textureCache(doc)
  const givenAppearance = appearance

  for (const material of root.listMaterials()) {
    const materialIndex = root.listMaterials().indexOf(material)
    const mtl = getMtlObject(material)

    const mtlDiffuse = getMaterialParamVec(mtl, 'Diffuse')
    const mtlSpecular = getMaterialParamVec(mtl, 'Specular')
    const mtlEmissive = getMaterialParamVec(mtl, 'Emissive')
    const mtlEmittance = getMaterialParamVec(mtl, 'Emittance')
    const mtlOpacity = getMaterialParamNum(mtl, 'Opacity')
    const mtlAlphaTest = getMaterialParamNum(mtl, 'AlphaTest')
    const mtlShininess = getMaterialParamNum(mtl, 'Shininess')
    const mtlTextures = getMtlTextures(mtl) || []

    // The diffuse color texture. All models should have this
    let mapDiffuse = mtlTextures.find((it) => it.Map === 'Diffuse')
    // Bumpmap and Smoothness are the same texture
    // - rgb -> Bumpmap
    // - a -> Smoothness
    let mapBumpmap = mtlTextures.find((it) => it.Map === 'Bumpmap')
    let mapSmoothness = mtlTextures.find((it) => it.Map === 'Smoothness')
    let mapSpecular = mtlTextures.find((it) => it.Map === 'Specular')
    let mapCustom = mtlTextures.find((it) => it.Map === 'Custom')
    const mapEmittance = mtlTextures.find((it) => it.Map === 'Emittance')
    const mapOpacity = mtlTextures.find((it) => it.Map === 'Opacity')
    const mapDecal = mtlTextures.find((it) => it.Map === 'Decal')
    const isGlass = mtl?.Shader === 'Glass'
    const isHair = mtl?.Shader === 'Hair'
    const isFxTransp = mtl?.Shader === 'Fxmeshadvancedtransp' // only isabella gaze has this shader

    const features = mtl.StringGenMask?.split('%') || []
    const featureOverlayMask = features.includes('OVERLAY_MASK')

    if (givenAppearance) {
      // armor items, mounts, weapons have a custom appearance definitions
      appearance = givenAppearance
    } else if (featureOverlayMask) {
      // resolve appearance params from the material
      appearance = mtlParamsToAppearance(mtl)
    } else {
      appearance = null
    }

    if (debug) {
      logger.debug(`==== MATERIAL: ${material.getName()} ===`)
      logger.debug(`  index      : ${materialIndex}`)
      logger.debug(`  found      : ${!!mtl}`)
      logger.debug(`  shader     :`, mtl?.Shader)
      logger.debug(`  Diffuse    :`, mtlDiffuse)
      logger.debug(`  Specular   :`, mtlSpecular)
      logger.debug(`  Emissive   :`, mtlEmissive)
      logger.debug(`  Emittance  :`, mtlEmittance)
      logger.debug(`  Opacity    :`, mtlOpacity)
      logger.debug(`  AlphaTest  :`, mtlAlphaTest)
      logger.debug(`  Shininess  :`, mtlShininess)
      logger.debug(`  textures   : ${mtlTextures.map((it) => it.Map)}`)
      logger.debug(`  Diffuse    : ${mapDiffuse?.File}`)
      logger.debug(`  Bumpmap    : ${mapBumpmap?.File}`)
      logger.debug(`  Smoothness : ${mapSmoothness?.File}`)
      logger.debug(`  Specular   : ${mapSpecular?.File}`)
      logger.debug(`  Custom     : ${mapCustom?.File}`)
      logger.debug(`  Emit       : ${mapEmittance?.File}`)
      logger.debug(`  Decal      : ${mapDecal?.File}`)
      logger.debug(`  params     :`, mtl)
      logger.debug(`  features   :`, features)
    }

    let texDiffuse: Texture
    let texBumpmap: Texture
    let texEmissive: Texture
    let texCustom: Texture
    let texSpecular: Texture

    if (!mapSmoothness && mapBumpmap) {
      logger.debug('use mapBumpmap as mapSmoothness')
      mapSmoothness = mapBumpmap
    }

    if (isFxTransp && !mapDiffuse) {
      mapDiffuse = mapCustom
      mapCustom = null
    }

    if (mapDiffuse?.File) {
      const file = `${mapDiffuse.File}`.toLowerCase()
      texDiffuse = await cache.addTextureFromFile(file, mapDiffuse.Map).catch((err) => {
        logger.error(`failed to read diffuse map\n\t${mapDiffuse.File}\n`, err)
        return null
      })
    }

    if (mapBumpmap?.File) {
      const file = `${mapBumpmap.File}`.toLowerCase()
      texBumpmap = await cache.addTextureFromFile(file, mapBumpmap.Map).catch((err) => {
        logger.error(`failed to read bumpmap\n\t${mapBumpmap.File}\n`, err)
        return null
      })
    }

    if (mapSpecular?.File) {
      const file = `${mapSpecular.File}`.toLowerCase()
      texSpecular = await cache.addTextureFromFile(file, mapSpecular.Map).catch((err) => {
        logger.error(`failed to read specular map\n\t${mapSpecular.File}\n`, err)
        return null
      })
    }

    if (texSpecular && mapSmoothness?.File && fs.existsSync(replaceExtname(mapSmoothness.File, '.a.png'))) {
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
        .catch((err) => {
          logger.error(`failed to merge specular gloss\n\t${glossFile}\n`, err)
          return texSpecular
        })
    }

    if (mapEmittance?.File) {
      const key = mapEmittance.File.toLowerCase()
      texEmissive = await cache.addTextureFromFile(key, mapEmittance.Map).catch((err) => {
        logger.error(`failed to read emittance map\n\t${mapEmittance.File}\n`, err)
        return null
      })
    }
    if (mapCustom?.File) {
      const key = mapCustom.File.toLowerCase()
      texCustom = await cache.addTextureFromFile(key, mapCustom.Map).catch((err) => {
        logger.error(`failed to read custom map\n\t${mapCustom.File}\n`, err)
        return null
      })
    }

    // if (appearance && bake) {
    //   if (mapCustom?.File && mapDiffuse?.File) {
    //     const key = `${appearanceId}-${mapDiffuse.File}-${mapCustom.File}}`.toLowerCase()
    //     texDiffuse = await cache
    //       .addTexture(key, async () => {
    //         return {
    //           name: mapDiffuse.Map,
    //           mime: 'image/png',
    //           data: await blendDiffuseMap({
    //             base: mapDiffuse.File,
    //             mask: mapCustom.File,
    //             appearance: appearance,
    //           }),
    //         }
    //       })
    //       .catch((err) => {
    //         logger.error(`failed to blend diffuse map\n\t${mapDiffuse.File}\n\t${mapCustom.File}\n`, err)
    //         return null
    //       })
    //   }
    //   if (mapSpecular?.File && mapCustom?.File) {
    //     const key = `${appearanceId}-${mapSpecular.File}-${mapCustom.File}`.toLowerCase()
    //     texSpecular = await cache
    //       .addTexture(key, async () => {
    //         return {
    //           name: mapSpecular.Map,
    //           mime: 'image/png',
    //           data: await blendSpecularMap({
    //             base: mapSpecular?.File,
    //             mask: mapCustom.File,
    //             appearance: appearance,
    //           }),
    //         }
    //       })
    //       .catch((err) => {
    //         logger.error(`failed to blend specular map\n\t${mapSpecular.File}\n\t${mapCustom.File}\n`, err)
    //         return null
    //       })
    //   }
    // }

    let texTransformProps: any
    if (mtl?.PublicParams && typeof mtl.PublicParams === 'object') {
      const ext = doc.createExtension(KHRTextureTransform)
      const props = ext.createTransform()
      props.setScale(
        // prettier-ignore
        [
          mtl.PublicParams.SOURCE_2D_TILE_X ?? 1,
          mtl.PublicParams.SOURCE_2D_TILE_Y ?? 1
        ],
      )
      props.setOffset(
        // prettier-ignore
        [
          mtl.PublicParams.SOURCE_2D_PHASE_X ?? 0,
          mtl.PublicParams.SOURCE_2D_PHASE_Y ?? 0
        ],
      )
      texTransformProps = props
    }

    if (mtlDiffuse && mtlDiffuse.length === 4) {
      material.setBaseColorFactor(mtlDiffuse as vec4)
    }
    if (texDiffuse) {
      material.setMetallicFactor(0)
      material.setBaseColorTexture(texDiffuse)
      if (texTransformProps) {
        material.getBaseColorTextureInfo().setExtension(KHRTextureTransform.EXTENSION_NAME, texTransformProps)
      }
    }
    if (texBumpmap) {
      material.setNormalTexture(texBumpmap)
      material.setNormalScale(1)
      if (texTransformProps) {
        material.getNormalTextureInfo().setExtension(KHRTextureTransform.EXTENSION_NAME, texTransformProps)
      }
    }
    if (texSpecular && !isGlass && !isHair) {
      const specExt = doc.createExtension(KHRMaterialsPBRSpecularGlossiness)
      specExt.setRequired(true)
      const specProps =
        material.getExtension<PBRSpecularGlossiness>(specExt.extensionName) || specExt.createPBRSpecularGlossiness()
      specProps.setDiffuseTexture(material.getBaseColorTexture())
      specProps.setSpecularGlossinessTexture(texSpecular)
      if (texTransformProps) {
        specProps.getDiffuseTextureInfo().setExtension(KHRTextureTransform.EXTENSION_NAME, texTransformProps)
        specProps.getSpecularGlossinessTextureInfo().setExtension(KHRTextureTransform.EXTENSION_NAME, texTransformProps)
      }

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

    if (texEmissive) {
      material.setEmissiveTexture(texEmissive)
      material.setEmissiveFactor([1, 1, 1])
    }
    if ((isFxTransp || texEmissive) && mtlEmittance && mtlEmittance.length >= 3) {
      // emittance seems to be only used for the intensity of the emissive texture
      // the alpha channel has a range of 0-20000, which we bring down with a log scale
      const value = [...mtlEmittance]
      if (value.length >= 3) {
        const scale = Math.log(1 + value[3]) / 10
        value[0] *= scale
        value[1] *= scale
        value[2] *= scale
        value.length = 3
      }
      material.setEmissiveFactor(value as vec3)
    } else if (mtlEmissive && mtlEmissive.length >= 3) {
      const value = [...mtlEmissive]
      value.length = 3
      material.setEmissiveFactor(value as vec3)
    }

    material.setAlphaMode('OPAQUE')
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
    if (isGlass) {
      const ext = doc.createExtension(KHRMaterialsTransmission)
      const props = ext.createTransmission()
      props.setTransmissionFactor(mtlOpacity ?? 1)
      material.setExtension(KHRMaterialsTransmission.EXTENSION_NAME, props)
    }

    if (appearance && texCustom) {
      const extension = doc.createExtension(NwAppearanceExtension)
      extension.setRequired(false)
      const props = extension.createProps()
      props.setData({
        ...appearance,
      })
      props.setMaskTexture(texCustom)
      material.setExtension(NwAppearanceExtension.EXTENSION_NAME, props)
    }
  }
}

function mtlParamsToAppearance(mtl: MtlObject) {
  const mapping = {
    EmittanceMapGamma: 'EmissiveIntensity',
    IndirectColor: 'EmissiveColor',

    Mask_A_Gloss: 'MaskAGloss',
    Mask_A_GlossShift: 'MaskAGlossShift',
    Mask_A_SpecColor_Override: 'MaskASpec',
    Mask_A_SpecColor: 'MaskASpecColor',
    Mask_B_Color: 'MaskBColor',
    Mask_B_Override: 'MaskBOverride',
    Mask_B: 'MaskB',
    Mask_G_Color: 'MaskGColor',
    Mask_G_Override: 'MaskGOverride',
    Mask_G: 'MaskG',
    Mask_R_Color: 'MaskRColor',
    Mask_R_Override: 'MaskROverride',
    Mask_R: 'MaskR',
  }

  const params: any = mtl.PublicParams
  if (typeof params !== 'object') {
    return null
  }

  const remapped = Object.entries(mapping).map(([key, newKey]) => {
    return [newKey, params[key as any] as any]
  })
  return Object.fromEntries(remapped)
}
