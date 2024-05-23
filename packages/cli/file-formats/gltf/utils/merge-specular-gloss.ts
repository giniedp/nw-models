import sharp from 'sharp'
import { logger } from '../../../utils/logger'

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
