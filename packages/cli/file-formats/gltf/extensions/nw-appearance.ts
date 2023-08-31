import { Document, Texture } from '@gltf-transform/core'
import {
  KHRMaterialsPBRSpecularGlossiness,
  PBRSpecularGlossiness
} from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import { MaterialObject } from 'file-formats/mtl'
import * as fs from 'fs'
import { Appearance, getAppearanceId } from '../../../types'
import { replaceExtname } from '../../../utils/file-utils'
import { NwAppearanceExtension } from './nw-appearance-extension'
import { blendDiffuseMap, blendSpecularMap, getMaterial, hexToRgb, mergeSpecularGloss, textureCache } from './utils'

export interface NwAppearanceOptions {
  materials: MaterialObject[]
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

  for (const mtl of root.listMaterials()) {

    // mtl.setNormalTexture(null)
    // mtl.setEmissiveTexture(null)
    // mtl.setBaseColorTexture(null)
    // mtl.setOcclusionTexture(null)
    // mtl.setMetallicRoughnessTexture(null)

    const mtlIndex = root.listMaterials().indexOf(mtl)
    const origMtl = getMaterial(materials, mtl.getName())
    const texFiles = origMtl?.textures || []
    logger.debug(`MATERIAL ${mtlIndex}: ${mtl.getName()}`)

    // <Texture Map="Smoothness" File="path_ddna.dds"/>
    // <Texture Map="Bumpmap" File="path_ddna.dds"/>
    // <Texture Map="Decal" File="path_noise_mask.dds"/>
    // <Texture Map="Specular" File="path_spec.dds"/>
    // <Texture Map="Diffuse" File="path_diff.dds"/>
    // <Texture Map="Custom" File="path_mask.dds"/>
    // <Texture Map="Emittance" File="path_emis.dds"/>

    // The diffuse color texture. All models should have this
    const mapDiffuse = texFiles.find((it) => it.Map === 'Diffuse')
    // Bumpmap and Smoothness are the same texture
    // - rgb -> Bumpmap
    // - a -> Smoothness
    const mapBumpmap = texFiles.find((it) => it.Map === 'Bumpmap')
    let mapSmoothness = texFiles.find((it) => it.Map === 'Smoothness')
    // Metal Materials have a specular map applied
    const mapSpecular = texFiles.find((it) => it.Map === 'Specular')
    // Custom color mask (dye color?)
    const mapCustom = texFiles.find((it) => it.Map === 'Custom')
    // Items that glow have an emit color map
    const mapEmit = texFiles.find((it) => it.Map === 'Emittance')

    logger.debug(`mapDiffuse ${mapDiffuse?.File}`)
    logger.debug(`mapBumpmap ${mapBumpmap?.File}`)
    logger.debug(`mapSmoothness ${mapSmoothness?.File}`)
    logger.debug(`mapSpecular ${mapSpecular?.File}`)
    logger.debug(`mapCustom ${mapCustom?.File}`)
    logger.debug(`mapEmit ${mapEmit?.File}`)

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
      mtl.setMetallicFactor(0)
      mtl.setBaseColorTexture(texDiffuse)
    }

    if (mapBumpmap?.File) {
      const key = `${mapBumpmap.File}`.toLowerCase()
      const tex = await cache.addTextureFromFile(key, mapBumpmap.Map)
      mtl.setNormalTexture(tex)
      mtl.setNormalScale(1)
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
        mtl.getExtension<PBRSpecularGlossiness>(specExt.extensionName) || specExt.createPBRSpecularGlossiness()
      specProps.setDiffuseTexture(mtl.getBaseColorTexture())
      specProps.setSpecularGlossinessTexture(texSpecular)
      mtl.setExtension(specExt.extensionName, specProps)

      // need to remove the pbrMetallicRoughness, otherwise playcanvas would pick that up instead
      mtl.setMetallicRoughnessTexture(null)
      mtl.setBaseColorTexture(null)
      mtl.setMetallicFactor(1) // makes it not being added to pbrMetallicRoughness
    }

    if (mapEmit) {
      const key = mapEmit.File.toLowerCase()
      const texEmit = await cache.addTextureFromFile(key, mapEmit.Map)
      mtl.setEmissiveTexture(texEmit)

      if (appearance?.EmissiveColor) {
        // max value of EmissiveIntensity is 10
        logger.debug('EMISSIVE', appearance.EmissiveIntensity, appearance.EmissiveColor)
        const factor = (appearance.EmissiveIntensity || 0) / 10
        const color = hexToRgb(appearance.EmissiveColor, 1 / 255)
        mtl.setEmissiveFactor([color.r * factor, color.g * factor, color.b * factor])
      } else {
        mtl.setEmissiveFactor([1, 1, 1])
        logger.debug('EMISSIVE', 'fallback', mtl.getEmissiveFactor())
      }
    }

    if (origMtl?.attrs?.AlphaTest) {
      mtl.setAlphaCutoff(Number(origMtl.attrs.AlphaTest))
      mtl.setAlphaMode('MASK')
      mtl.setDoubleSided(true)
    }

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
    mtl.setExtension(NwAppearanceExtension.EXTENSION_NAME, props)
  }
}
