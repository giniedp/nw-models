import { Document, FileUtils, ImageUtils, Texture, vec3 } from '@gltf-transform/core'
import * as fs from 'fs'
import sharp from 'sharp'
import { Appearance } from '../../../types'
import { logger } from '../../../utils/logger'

export async function blendDiffuseMap({
  base,
  mask,
  appearance,
}: {
  base: string
  mask: string
  appearance: Appearance
}): Promise<Buffer> {
  logger.debug('R', appearance.MaskROverride, appearance.MaskR, appearance.MaskRColor, appearance.RDyeSlotDisabled)
  logger.debug('G', appearance.MaskGOverride, appearance.MaskG, appearance.MaskGColor, appearance.GDyeSlotDisabled)
  logger.debug('B', appearance.MaskBOverride, appearance.MaskB, appearance.MaskBColor, appearance.BDyeSlotDisabled)

  let maskR = appearance.MaskR || 0
  let maskG = appearance.MaskG || 0
  let maskB = appearance.MaskB || 0
  let maskA = appearance.MaskASpec || 0

  if (!(maskR || maskG || maskB || maskA)) {
    return null
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

  return await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  })
    .toFormat('png')
    .toBuffer()
}

export async function blendEmissiveMap({ base, mask }: { base: string; mask: string }): Promise<Buffer> {
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

    baseData[i + 0] = albedoR * emitR * 255
    baseData[i + 1] = albedoG * emitG * 255
    baseData[i + 2] = albedoB * emitB * 255
  }

  return await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  })
    .toFormat('png')
    .toBuffer()
}

export async function blendSpecularMap({
  base,
  mask,
  appearance,
}: {
  base: string
  mask: string
  appearance: Appearance
}): Promise<Buffer> {
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

  return await sharp(baseData, {
    raw: { width: sBase.info.width, height: sBase.info.height, channels: sBase.info.channels },
  })
    .toFormat('png')
    .toBuffer()
}

export async function mergeSpecularGloss({
  spec,
  gloss,
}: {
  spec: string | Buffer | Uint8Array
  gloss: string | Buffer | Uint8Array
}): Promise<Buffer> {
  const specMap = await sharp(gloss).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const glossMap = await sharp(spec).raw().ensureAlpha().toBuffer({ resolveWithObject: true })

  if (specMap.info.width !== glossMap.info.width) {
    logger.warn('spec and gloss texture size mismatch')
    return null
  }

  const outData = new Uint8ClampedArray(specMap.data)
  const glossData = new Uint8ClampedArray(glossMap.data)

  for (let i = 0; i < outData.length; i += specMap.info.channels) {
    outData[i + 3] = glossData[i]
  }
  return await sharp(outData, {
    raw: { width: specMap.info.width, height: specMap.info.height, channels: specMap.info.channels },
  })
    .toFormat('png')
    .toBuffer()
}

export function rgbToHex(rgb: vec3) {
  return (
    '#' +
    [rgb[0], rgb[1], rgb[2]]
      .map((x) => {
        const hex = Math.round(x * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}
export function hexToRgb(hex: string, scale = 1) {
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

export function textureCache(doc: Document) {
  function getTexture(key: string) {
    return doc
      .getRoot()
      .listTextures()
      .find((it) => {
        return getKey(it) === key
      })
  }

  function getKey(tex: Texture): string {
    return String(tex?.getExtras()?.textureKey || '')
  }

  function setKey(tex: Texture, key: string) {
    const extras = tex.getExtras() || {}
    extras.textureKey = key
    tex.setExtras(extras)
  }

  function clearKeys() {
    doc
      .getRoot()
      .listTextures()
      .forEach((it) => {
        const extras = it.getExtras()
        if (extras) {
          delete extras.textureKey
        }
      })
  }

  async function addForKey(key: string, fn: (key: string) => Promise<Texture>): Promise<Texture> {
    const tex = getTexture(key) || (await fn(key))
    if (tex) {
      setKey(tex, key)
    }
    return tex
  }

  async function addTexture(
    key: string,
    fn: () => Promise<{ name?: string; mime: string; data: Buffer }>,
  ): Promise<Texture> {
    return addForKey(key, async () => {
      const img = await fn()
      if (img?.data) {
        const tex = doc.createTexture(img.name || key)
        tex.setImage(img.data)
        tex.setMimeType(img.mime)
        return tex
      }
      return null
    })
  }

  async function addTextureFromFile(imageFile: string, name?: string): Promise<Texture> {
    return addTexture(imageFile, async () => {
      return {
        data: await fs.promises.readFile(imageFile),
        mime: ImageUtils.extensionToMimeType(FileUtils.extension(imageFile)),
        name: name,
      }
    })
  }

  return {
    addTexture,
    addTextureFromFile,
    clearKeys,
    getKey,
  }
}
