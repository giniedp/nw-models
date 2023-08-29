import { GLTF } from '@gltf-transform/core'
import * as fs from 'fs'
import sharp from 'sharp'
import { MaterialObject } from '../../../file-formats/mtl'
import { Appearance, getAppearanceId } from '../../../types'
import { appendToFilename, replaceExtname } from '../../../utils/file-utils'
import { logger } from '../../../utils/logger'
import { createHash } from 'crypto'

export interface FixMaterialsOptions {
  /**
   * The gltf document to update
   */
  gltf: GLTF.IGLTF
  /**
   * Whether to update existing files
   */
  update: boolean
  /**
   * The appearance of the model with tint colors and other settings
   */
  appearance: Appearance
  /**
   * Original materials infos from mtl file
   */
  material: MaterialObject[]
  /**
   * Whether to bake the appearance colors into the diffuse texture
   */
  bakeAppearance: boolean
}

export async function fixMaterials({ gltf, update, material, appearance, bakeAppearance }: FixMaterialsOptions) {
  if (!gltf.materials) {
    return
  }

  if (!gltf.samplers?.length) {
    gltf.samplers = [
      {
        magFilter: 9729,
        minFilter: 9986,
        wrapS: 10497,
        wrapT: 10497,
      },
    ]
  }
  gltf.images = gltf.images || []
  gltf.textures = gltf.textures || []
  gltf.extras = gltf.extras || {}
  if (appearance) {
    gltf.extras.appearanceBaked = bakeAppearance
    gltf.extras.appearance = appearance
  } else {
    bakeAppearance = false
  }

  const cache = textureCache(gltf)

  for (const mtl of gltf.materials) {
    const origMtl = getMaterial(material, mtl.name)
    const textures = origMtl?.textures || []
    const appearanceFileSuffix = (hashContent?: string) => {
      const idSuffix = appearance ? getAppearanceId(appearance) : ''
      const bakeSuffix = bakeAppearance ? 'baked' : ''
      const hashSuffix = hashContent ? createHash('md5').update(hashContent).digest('hex') : ''
      return [idSuffix, bakeSuffix, hashSuffix].filter((it) => it).join('_')
    }

    // <Texture Map="Smoothness" File="path_ddna.dds"/>
    // <Texture Map="Bumpmap" File="path_ddna.dds"/>
    // <Texture Map="Decal" File="path_noise_mask.dds"/>
    // <Texture Map="Specular" File="path_spec.dds"/>
    // <Texture Map="Diffuse" File="path_diff.dds"/>
    // <Texture Map="Custom" File="path_mask.dds"/>
    // <Texture Map="Emittance" File="path_emis.dds"/>

    // The diffuse color texture. All models should have this
    const mapDiffuse = textures.find((it) => it.Map === 'Diffuse')
    // Bumpmap and Smoothness are the same texture
    // - rgb -> Bumpmap
    // - a -> Smoothness
    const mapBumpmap = textures.find((it) => it.Map === 'Bumpmap')
    let mapSmoothness = textures.find((it) => it.Map === 'Smoothness')
    // Metal Materials have a specular map applied
    const mapSpecular = textures.find((it) => it.Map === 'Specular')
    // Custom color mask (dye color?)
    const mapCustom = textures.find((it) => it.Map === 'Custom')
    // Items that glow have an emit color map
    const mapEmit = textures.find((it) => it.Map === 'Emittance')

    logger.debug('mapDiffuse', mapDiffuse?.File)
    logger.debug('mapBumpmap', mapBumpmap?.File)
    logger.debug('mapSmoothness', mapSmoothness?.File)
    logger.debug('mapSpecular', mapSpecular?.File)
    logger.debug('mapCustom', mapCustom?.File)
    logger.debug('mapEmit', mapEmit?.File)

    if (!mapSmoothness && mapBumpmap) {
      logger.debug('use mapBumpmap as mapSmoothness')
      mapSmoothness = mapBumpmap
    }

    let mapDiffuseFile: string = mapDiffuse?.File
    if (mapCustom && mapDiffuseFile && bakeAppearance) {
      const cacheSource = [mapDiffuseFile, mapCustom.File].join('-')
      const cacheFile = appendToFilename(mapDiffuseFile, appearanceFileSuffix(cacheSource))
      mapDiffuseFile = await withFileCache(cacheFile, update, () => {
        return blendDiffuseMap({
          base: mapDiffuseFile,
          mask: mapCustom.File,
          appearance: appearance,
          outFile: cacheFile,
        })
      })
        .catch((err) => {
          logger.error(`failed to blend diffuse map\n\t${mapDiffuseFile}\n\t${mapCustom.File}\n\t${cacheFile}\n`, err)
          return mapDiffuseFile
        })
        .then((result) => {
          return result || mapDiffuse?.File
        })
    }

    if (mapDiffuseFile) {
      mtl.pbrMetallicRoughness = {
        baseColorTexture: {
          index: await cache.addTextureFromFile(mapDiffuseFile),
        },
        metallicFactor: 0,
      }
    }

    if (mapBumpmap && mtl.normalTexture) {
      mtl.normalTexture.index = await cache.addTextureFromFile(mapBumpmap.File)
      mtl.normalTexture.scale = 1
    }

    let mapSpecularFile: string = mapSpecular?.File
    if (mapCustom && mapSpecularFile && bakeAppearance) {
      const hashContent = [mapSpecularFile, mapCustom.File].join('-')
      const cacheFile = appendToFilename(mapSpecularFile, appearanceFileSuffix(hashContent))
      mapSpecularFile = await withFileCache(cacheFile, update, () => {
        return blendSpecularMap({
          base: mapSpecularFile,
          mask: mapCustom.File,
          appearance: appearance,
          outFile: cacheFile,
        })
      })
        .catch((err) => {
          logger.error(`failed to blend specular map\n\t${mapSpecularFile}\n\t${mapCustom.File}\n\t${cacheFile}\n`, err)
          return mapSpecularFile
        })
        .then((result) => {
          return result || mapSpecular?.File
        })
    }

    if (mapSpecularFile) {
      if (mapSmoothness && fs.existsSync(replaceExtname(mapSmoothness.File, '.a.png'))) {
        const glossFile = replaceExtname(mapSmoothness.File, '.a.png')
        const hashContent = [mapSpecularFile, glossFile].join('-')
        const cacheFile = replaceExtname(
          appendToFilename(mapSmoothness.File, appearanceFileSuffix(hashContent)),
          '.a.png',
        )
        mapSpecularFile = await withFileCache(cacheFile, update, () => {
          return mergeSpecularGloss({
            specFile: mapSpecularFile,
            glossFile: glossFile,
            outFile: cacheFile,
          })
        }).catch((err) => {
          logger.error(`failed to merge specular gloss\n\t${mapSpecularFile}\n\t${glossFile}\n\t${cacheFile}\n`, err)
          return mapSpecularFile
        })
      }
      const indexDiffuse = mtl.pbrMetallicRoughness.baseColorTexture
      const indexSpecGloss = await cache.addTextureFromFile(mapSpecularFile)
      gltf.extensionsUsed = append(gltf.extensionsUsed, 'KHR_materials_pbrSpecularGlossiness')
      gltf.extensionsRequired = append(gltf.extensionsRequired, 'KHR_materials_pbrSpecularGlossiness')

      // https://kcoley.github.io/glTF/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/
      mtl.extensions = mtl.extensions || {}
      mtl.extensions.KHR_materials_pbrSpecularGlossiness = {
        diffuseTexture: indexDiffuse,
        specularGlossinessTexture: {
          index: indexSpecGloss,
        },
      }
      // need to remove the pbrMetallicRoughness, otherwise playcanvas would pick that up instead
      delete mtl.pbrMetallicRoughness
    }

    if (mapEmit) {
      mtl.emissiveTexture = {
        index: await cache.addTextureFromFile(mapEmit.File),
      }
      if (appearance?.EmissiveColor) {
        // max value of EmissiveIntensity is 10
        logger.debug('EMISSIVE', appearance.EmissiveIntensity, appearance.EmissiveColor)
        const factor = (appearance.EmissiveIntensity || 0) / 10
        const color = hexToRgb(appearance.EmissiveColor, 1 / 255)
        mtl.emissiveFactor = [color.r * factor, color.g * factor, color.b * factor]
      } else {
        mtl.emissiveFactor = [1, 1, 1, 1]
        logger.debug('EMISSIVE', 'fallback', mtl.emissiveFactor)
      }
    }

    if (origMtl?.attrs?.AlphaTest) {
      mtl.alphaCutoff = Number(origMtl.attrs.AlphaTest)
      mtl.alphaMode = 'MASK' as any
      mtl.doubleSided = true
    }
  }
}

export async function attachMaskTexture({ gltf, material }: { gltf: GLTF.IGLTF; material: MaterialObject[] }) {
  if (!gltf.materials) {
    return
  }
  const cache = textureCache(gltf)
  for (const mtl of gltf.materials) {
    const origMtl = getMaterial(material, mtl.name)
    const textures = origMtl?.textures || []
    const mapCustom = textures.find((it) => it.Map === 'Custom')
    if (mapCustom) {
      logger.debug('attach mask', mapCustom.File)
      mtl.extras = mtl.extras || {}
      mtl.extras.maskTexture = {
        index: await cache.addTextureFromFile(mapCustom.File),
      }
    }
  }
}

function append(array: string[], value: string) {
  array = array || []
  if (!array.includes(value)) {
    array.push(value)
  }
  return array
}

function getMaterial(list: MaterialObject[], name: string) {
  if (list?.length === 1) {
    return list[0]
  }
  return list.find((it) => it.attrs.Name.toLowerCase() === name.toLowerCase())
}

async function blendDiffuseMap({
  base,
  mask,
  appearance,
  outFile,
}: {
  base: string
  mask: string
  appearance: Appearance
  outFile: string
}) {
  logger.debug('R', appearance.MaskROverride, appearance.MaskR, appearance.MaskRColor, appearance.RDyeSlotDisabled)
  logger.debug('G', appearance.MaskGOverride, appearance.MaskG, appearance.MaskGColor, appearance.GDyeSlotDisabled)
  logger.debug('B', appearance.MaskBOverride, appearance.MaskB, appearance.MaskBColor, appearance.BDyeSlotDisabled)

  let maskR = appearance.MaskR || 0
  let maskG = appearance.MaskG || 0
  let maskB = appearance.MaskB || 0
  let maskA = appearance.MaskASpec || 0

  if (!(maskR || maskG || maskB || maskA)) {
    return
  }
  if (!(appearance.MaskRColor || appearance.MaskGColor || appearance.MaskBColor)) {
    return null
  }

  const sBase = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const sMask = await sharp(mask).raw().toBuffer({ resolveWithObject: true })

  if (sBase.info.width !== sMask.info.width) {
    logger.warn('base and mask texture size mismatch')
    return null
  }

  const baseData = new Uint8ClampedArray(sBase.data)
  const maskData = new Uint8ClampedArray(sMask.data)
  const colR = hexToRgb(appearance.MaskRColor, 1 / 255)
  const colG = hexToRgb(appearance.MaskGColor, 1 / 255)
  const colB = hexToRgb(appearance.MaskBColor, 1 / 255)
  const colA = hexToRgb(appearance.MaskASpecColor, 1 / 255)

  for (let i = 0; i < baseData.length; i += sBase.info.channels) {
    const weightR = (maskData[i + 0] / 255) * maskR
    const weightG = (maskData[i + 1] / 255) * maskG
    const weightB = (maskData[i + 2] / 255) * maskB
    const weightA = (maskData[i + 3] / 255) * maskA

    let albedoR = baseData[i + 0] / 255
    let albedoG = baseData[i + 1] / 255
    let albedoB = baseData[i + 2] / 255
    let albedoA = baseData[i + 3] / 255

    if (weightR) {
      albedoR = lerp(albedoR, colR.r, weightR)
      albedoG = lerp(albedoG, colR.g, weightR)
      albedoB = lerp(albedoB, colR.b, weightR)
    }
    if (weightG) {
      albedoR = lerp(albedoR, colG.r, weightG)
      albedoG = lerp(albedoG, colG.g, weightG)
      albedoB = lerp(albedoB, colG.b, weightG)
    }
    if (weightB) {
      albedoR = lerp(albedoR, colB.r, weightB)
      albedoG = lerp(albedoG, colB.g, weightB)
      albedoB = lerp(albedoB, colB.b, weightB)
    }
    if (weightA) {
      albedoR = lerp(albedoR, colA.r, weightA)
      albedoG = lerp(albedoG, colA.g, weightA)
      albedoB = lerp(albedoB, colA.b, weightA)
    }

    baseData[i + 0] = albedoR * 255
    baseData[i + 1] = albedoG * 255
    baseData[i + 2] = albedoB * 255
  }

  logger.activity('write', outFile)
  await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  }).toFile(outFile)
  return outFile
}

async function blendEmissiveMap({
  base,
  mask,
  outFile,
}: {
  base: string
  mask: string
  outFile: string
}) {

  const sBase = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const sMask = await sharp(mask).raw().toBuffer({ resolveWithObject: true })

  if (sBase.info.width !== sMask.info.width) {
    logger.warn('base and mask texture size mismatch')
    return null
  }

  const baseData = new Uint8ClampedArray(sBase.data)
  const emitData = new Uint8ClampedArray(sMask.data)

  for (let i = 0; i < baseData.length; i += sBase.info.channels) {
    let albedoR = baseData[i + 0] / 255
    let albedoG = baseData[i + 1] / 255
    let albedoB = baseData[i + 2] / 255

    let emitR = emitData[i + 0] / 255
    let emitG = emitData[i + 1] / 255
    let emitB = emitData[i + 2] / 255

    baseData[i + 0] = (albedoR * emitR) * 255
    baseData[i + 1] = (albedoG * emitG) * 255
    baseData[i + 2] = (albedoB * emitB) * 255
  }

  logger.activity('write', outFile)
  await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  }).toFile(outFile)
  return outFile
}
async function blendSpecularMap({
  base,
  mask,
  appearance,
  outFile,
}: {
  base: string
  mask: string
  appearance: Appearance
  outFile: string
}): Promise<string> {
  logger.debug('A', appearance.MaskASpec, appearance.MaskASpecColor, appearance.ADyeSlotDisabled)
  if (!appearance.MaskASpec) {
    return null
  }
  if (!appearance.MaskASpecColor) {
    return null
  }

  const sBase = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const sMask = await sharp(mask).raw().toBuffer({ resolveWithObject: true })

  if (sBase.info.width !== sMask.info.width) {
    logger.warn('base and mask texture size mismatch')
    return null
  }

  const baseData = new Uint8ClampedArray(sBase.data)
  const maskData = new Uint8ClampedArray(sMask.data)
  const tintColor = hexToRgb(appearance.MaskASpecColor, 1 / 255)

  for (let i = 0; i < baseData.length; i += sBase.info.channels) {
    const weight = maskData[i + 3] / 255

    let specR = baseData[i + 0] / 255
    let specG = baseData[i + 1] / 255
    let specB = baseData[i + 2] / 255

    if (appearance.MaskASpec) {
      specR = lerp(specR, tintColor.r, appearance.MaskASpec)
      specG = lerp(specG, tintColor.g, appearance.MaskASpec)
      specB = lerp(specB, tintColor.b, appearance.MaskASpec)
    }

    baseData[i + 0] = specR * 255 * weight
    baseData[i + 1] = specG * 255 * weight
    baseData[i + 2] = specB * 255 * weight
  }

  logger.activity('write', outFile)
  await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  }).toFile(outFile)
  return outFile
}

async function mergeSpecularGloss({
  glossFile,
  specFile,
  outFile,
}: {
  glossFile: string
  specFile: string
  outFile: string
}) {
  // logger.activity('write', fileName)
  // const gloss = await sharp(glossFile).extractChannel(0).toBuffer()
  // await sharp(specFile).removeAlpha().joinChannel(gloss).toFile(fileName)
  // return fileName

  // the above does not work somehow (no alpha channel gets created)
  // have to do it by hand

  const specMap = await sharp(specFile).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const glossMap = await sharp(glossFile).raw().ensureAlpha().toBuffer({ resolveWithObject: true })

  if (specMap.info.width !== glossMap.info.width) {
    logger.warn('spec and gloss texture size mismatch')
    return specFile
  }

  const outData = new Uint8ClampedArray(specMap.data)
  const glossData = new Uint8ClampedArray(glossMap.data)

  for (let i = 0; i < outData.length; i += specMap.info.channels) {
    outData[i + 3] = glossData[i]
  }
  logger.activity('write', outFile)
  await sharp(outData, {
    raw: { width: specMap.info.width, height: specMap.info.height, channels: specMap.info.channels },
  }).toFile(outFile)
  return outFile
}

function hexToRgb(hex: string, scale = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) * scale,
        g: parseInt(result[2], 16) * scale,
        b: parseInt(result[3], 16) * scale,
      }
    : {
        r: 0,
        g: 0,
        b: 0,
      }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

async function withFileCache(file: string, update: boolean, fn: () => Promise<any>): Promise<string> {
  if (fs.existsSync(file) && update) {
    fs.unlinkSync(file)
  }
  if (!fs.existsSync(file) || update) {
    logger.debug('update', file)
    await fn()
  }
  if (!fs.existsSync(file)) {
    logger.debug('skipped', file)
    return null
  }
  return file
}

function textureCache(gltf: GLTF.IGLTF) {
  gltf.images = gltf.images || []
  gltf.textures = gltf.textures || []

  const cache = new Map<string, number>()
  async function addTexture(key: string, fn: () => Promise<string>): Promise<number> {
    if (cache.has(key)) {
      return cache.get(key)
    }
    const imageIndex = gltf.images.length
    const textureIndex = gltf.textures.length
    gltf.images.push({
      uri: await fn(),
    })
    gltf.textures.push({
      sampler: 0,
      source: imageIndex,
    })
    return textureIndex
  }
  async function addTextureFromFile(imageFile: string): Promise<number> {
    return addTexture(imageFile, async () => {
      return fs.promises.readFile(imageFile).then((it) => `data:image/png;base64,` + it.toString('base64'))
    })
  }
  return {
    addTexture: addTexture,
    addTextureFromFile: addTextureFromFile,
  }
}
