import sharp from 'sharp'
import { logger } from '../../../utils/logger'

export type Pixel = [number, number, number, number]
export type PixelOperation = (pixels: Pixel[], out: Pixel) => void
export async function textureMerge(
  textureFiles: Array<string | Buffer | Uint8Array>,
  operation: PixelOperation,
): Promise<Buffer> {
  const maps: Array<{
    data: Buffer
    info: sharp.OutputInfo
  }> = []
  for (const file of textureFiles) {
    let map = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
    if (!maps.length || map.info.width === maps[0].info.width && map.info.height === maps[0].info.height) {
      maps.push(map)
      continue
    }
    map = await sharp(file).raw().ensureAlpha().resize({
      width: maps[0].info.width,
      height: maps[0].info.height,
      fit: 'contain',
    }).toBuffer({ resolveWithObject: true })
    maps.push(map)
  }

  const buffers = maps.map((map) => new Uint8ClampedArray(map.data))
  const pixels = buffers.map((): Pixel => [0, 0, 0, 0])
  const outPixel: Pixel = [0, 0, 0, 0]
  for (let i = 0; i < buffers[0].length; i += maps[0].info.channels) {
    for (let iBuffer = 0; iBuffer < buffers.length; iBuffer++) {
      const pixel = pixels[iBuffer]
      const buffer = buffers[iBuffer]
      pixel[0] = buffer[i]
      pixel[1] = buffer[i + 1]
      pixel[2] = buffer[i + 2]
      pixel[3] = buffer[i + 3]
    }
    operation(pixels, outPixel)
    buffers[0][i] = outPixel[0]
    buffers[0][i + 1] = outPixel[1]
    buffers[0][i + 2] = outPixel[2]
    buffers[0][i + 3] = outPixel[3]
  }
  return await sharp(buffers[0], {
    raw: { width: maps[0].info.width, height: maps[0].info.height, channels: maps[0].info.channels },
  })
    .toColorspace('rgba')
    .toFormat('png')
    .toBuffer()
}
