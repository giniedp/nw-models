import { GLTF } from '@gltf-transform/core'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import { MaterialObject } from '../../../file-formats/mtl'
import { Appearance, getAppearanceId } from '../../../types'
import { replaceExtname } from '../../../utils/file-utils'
import { logger } from '../../../utils/logger'

export async function fixMaterials({
  material,
  appearance,
  update,
  gltf,
}: {
  material: MaterialObject[]
  appearance: Appearance
  update: boolean
  gltf: GLTF.IGLTF
}) {
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

  const cache = new Map<string, number>()
  async function appendTexture(key: string, fn: () => Promise<string>): Promise<number> {
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
  async function appendTextureFromFile(imageFile: string): Promise<number> {
    return appendTexture(imageFile, async () => {
      return fs.promises.readFile(imageFile).then((it) => `data:image/png;base64,` + it.toString('base64'))
    })
  }

  for (const mtl of gltf.materials) {
    const origMtl = getMaterial(material, mtl.name)
    const textures = origMtl?.textures || []

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
    const mapSmoothness = textures.find((it) => it.Map === 'Smoothness')
    // Metal Materials have a specular map applied
    const mapSpecular = textures.find((it) => it.Map === 'Specular')
    // Custom color mask (dye color?)
    const mapCustom = textures.find((it) => it.Map === 'Custom')
    // Items that glow have an emit color map
    const mapEmit = textures.find((it) => it.Map === 'Emittance')

    let mapDiffuseTint: string
    if (mapCustom && mapDiffuse) {
      mapDiffuseTint = await blitDiffuse({
        base: mapDiffuse.File,
        mask: mapCustom.File,
        appearance: appearance,
        update: update,
      })
    }

    if (mapDiffuseTint) {
      const file = mapDiffuseTint
      mtl.pbrMetallicRoughness = {
        baseColorTexture: {
          index: await appendTextureFromFile(file),
        },
        metallicFactor: 0,
      }
    }

    if (mapBumpmap && mtl.normalTexture) {
      mtl.normalTexture.index = await appendTextureFromFile(mapBumpmap.File)
      mtl.normalTexture.scale = 1
    }

    let mapSpecularTint: string
    if (mapCustom && mapSpecular) {
      mapSpecularTint = await blitSpecular({
        base: mapSpecular.File,
        mask: mapCustom.File,
        appearance: appearance,
        update: update,
      })
    }

    if (mapSpecularTint || mapSpecular) {
      let file = mapSpecularTint || mapSpecular.File
      if (mapSmoothness && fs.existsSync(replaceExtname(mapSmoothness.File, '.a.png'))) {
        file = await mergeSpecularGloss({
          specFile: file,
          glossFile: replaceExtname(mapSmoothness.File, '.a.png'),
          appearance: appearance,
          update,
        })
      }

      const indexDiffuse = mtl.pbrMetallicRoughness.baseColorTexture
      const indexSpecGloss = await appendTextureFromFile(file)
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
        index: await appendTextureFromFile(mapEmit.File),
      }
      if (appearance.EmissiveColor) {
        // max value of EmissiveIntensity is 10
        const factor = (appearance.EmissiveIntensity || 0) / 10
        const color = hexToRgb(appearance.EmissiveColor, 1 / 255)
        mtl.emissiveFactor = [color.r * factor, color.g * factor, color.b * factor]
      }
    }

    if (origMtl?.attrs?.AlphaTest) {
      mtl.alphaCutoff = Number(origMtl.attrs.AlphaTest)
      mtl.alphaMode = 'MASK' as any
      mtl.doubleSided = true
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

async function blitDiffuse({
  base,
  mask,
  appearance,
  update,
}: {
  base: string
  mask: string
  appearance: Appearance
  update: boolean
}) {
  const maskR = appearance.MaskROverride || appearance.MaskR || 0
  const maskG = appearance.MaskGOverride || appearance.MaskG || 0
  const maskB = appearance.MaskBOverride || appearance.MaskB || 0
  if (!(maskR || maskG || maskB)) {
    return
  }

  const maskColorR = appearance.MaskRColor
  const maskColorG = appearance.MaskGColor
  const maskColorB = appearance.MaskBColor
  if (!(maskColorR || maskColorG || maskColorB)) {
    return null
  }

  const id = getAppearanceId(appearance).toLowerCase()
  const fileName = path.join(
    path.dirname(base),
    path.basename(base, path.extname(base)) + '_' + id + path.extname(base),
  )
  if (fs.existsSync(fileName) && !update) {
    return fileName
  }

  const sBase = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const sMask = await sharp(mask).raw().toBuffer({ resolveWithObject: true })

  if (sBase.info.width !== sMask.info.width) {
    logger.warn('base and mask texture size mismatch')
    return null
  }

  const baseData = new Uint8ClampedArray(sBase.data)
  const maskData = new Uint8ClampedArray(sMask.data)
  const colR = hexToRgb(appearance.MaskRColor)
  const colG = hexToRgb(appearance.MaskGColor)
  const colB = hexToRgb(appearance.MaskBColor)

  for (let i = 0; i < baseData.length; i += sBase.info.channels) {
    const x = maskData[i + 0] / 255
    const y = maskData[i + 1] / 255
    const z = maskData[i + 2] / 255
    const r = x * colR.r + y * colG.r + z * colB.r
    const g = x * colR.g + y * colG.g + z * colB.g
    const b = x * colR.b + y * colG.b + z * colB.b
    baseData[i + 0] = lerp(baseData[i + 0], r, maskR || 0)
    baseData[i + 1] = lerp(baseData[i + 1], g, maskG || 0)
    baseData[i + 2] = lerp(baseData[i + 2], b, maskB || 0)
  }

  logger.activity('write', fileName)
  await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  }).toFile(fileName)
  return fileName
}

async function blitSpecular({
  base,
  mask,
  appearance,
  update,
}: {
  base: string
  mask: string
  appearance: Appearance
  update: boolean
}) {
  if (!appearance.MaskASpec) {
    return null
  }
  if (!appearance.MaskASpecColor) {
    return null
  }

  const id = getAppearanceId(appearance).toLowerCase()
  const fileName = path.join(
    path.dirname(base),
    path.basename(base, path.extname(base)) + '_' + id + path.extname(base),
  )
  if (fs.existsSync(fileName) && !update) {
    return fileName
  }
  const sBase = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const sMask = await sharp(mask).raw().toBuffer({ resolveWithObject: true })

  if (sBase.info.width !== sMask.info.width) {
    logger.warn('base and mask texture size mismatch')
    return null
  }

  const baseData = new Uint8ClampedArray(sBase.data)
  const maskData = new Uint8ClampedArray(sMask.data)
  const colA = hexToRgb(appearance.MaskASpecColor)

  for (let i = 0; i < baseData.length; i += sBase.info.channels) {
    const r = (maskData[i + 3] / 255) * colA.r
    const g = (maskData[i + 3] / 255) * colA.g
    const b = (maskData[i + 3] / 255) * colA.b
    baseData[i + 0] = lerp(baseData[i + 0], r, appearance.MaskASpec)
    baseData[i + 1] = lerp(baseData[i + 1], g, appearance.MaskASpec)
    baseData[i + 2] = lerp(baseData[i + 2], b, appearance.MaskASpec)
  }

  logger.activity('write', fileName)
  await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  }).toFile(fileName)
  return fileName
}

async function mergeSpecularGloss({
  glossFile,
  specFile,
  appearance,
  update,
}: {
  glossFile: string
  specFile: string
  appearance: Appearance
  update: boolean
}) {
  const id = getAppearanceId(appearance).toLowerCase()
  const fileName = path.join(
    path.dirname(glossFile),
    path.basename(glossFile, path.extname(glossFile)) + '_' + id + path.extname(glossFile),
  )
  if (fs.existsSync(fileName) && !update) {
    return fileName
  }

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
  logger.activity('write', fileName)
  await sharp(outData, {
    raw: { width: specMap.info.width, height: specMap.info.height, channels: specMap.info.channels },
  }).toFile(fileName)
  return fileName
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
