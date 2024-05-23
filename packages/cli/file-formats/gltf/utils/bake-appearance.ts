import sharp from 'sharp'
import { Appearance } from '../../../types'
import { logger } from '../../../utils/logger'
import { colorToRgb } from './colors'

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
  const colR = colorToRgb(appearance.MaskRColor)
  const colG = colorToRgb(appearance.MaskGColor)
  const colB = colorToRgb(appearance.MaskBColor)
  const colA = colorToRgb(appearance.MaskASpecColor)

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
  const tintColor = colorToRgb(appearance.MaskASpecColor)

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
