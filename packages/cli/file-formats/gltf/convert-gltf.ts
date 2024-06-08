import { Transform } from '@gltf-transform/core'
import { textureCompress } from '@gltf-transform/functions'

import path from 'node:path'
import sharp from 'sharp'
import { logger } from '../../utils/logger'
import { toktx } from './transform/toktx'
import { gltfIO, writeGlb, writeGltf } from './write-gltf'

export interface ConvertGltfOptions {
  input: string
  output: string
  embedData?: boolean
  textureFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'ktx'
  textureQuality?: number
  textureSize?: number
  ktxThreadSize?: number
}
export async function convertGltf({ input, output, embedData, textureFormat, textureQuality, ktxThreadSize, textureSize }: ConvertGltfOptions) {
  const transforms: Transform[] = []

  if (textureFormat === 'ktx') {
    transforms.push(
      toktx({
        matcher: [
          {
            slots: /(normal)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'linear',
              '--assign-primaries', 'none',
              '--format', 'R8G8B8_UNORM',
              '--threads', ktxThreadSize ? String(ktxThreadSize) : '1',
            ],
          },
          {
            slots: /(mask)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'linear',
              '--assign-primaries', 'none',
              '--format', 'R8G8B8A8_UNORM',
              '--threads', ktxThreadSize ? String(ktxThreadSize) : '1',
            ],
          },
          {
            slots: /(specular)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'srgb',
              '--assign-primaries', 'bt709',
              '--format', 'R8G8B8A8_UNORM',
              '--threads', ktxThreadSize ? String(ktxThreadSize) : '1',
            ],
          },
          {
            slots: /(baseColor|diffuse|emissive|occlusion)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'basis-lz',
              '--assign-oetf', 'srgb',
              '--assign-primaries', 'bt709',
              '--format', 'R8G8B8A8_SRGB',
              '--threads', ktxThreadSize ? String(ktxThreadSize) : '1',
            ],
          },
        ],
      }),
    )
  } else if (textureFormat) {
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        quality: textureQuality || null,
        slots: /(baseColor|diffuse|emissive|occlusion)/,
        resize: textureSize ? [textureSize, textureSize] : undefined,
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        nearLossless: true,
        slots: /(specular)/,
        resize: textureSize ? [textureSize, textureSize] : undefined,
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        lossless: true,
        slots: /(normal)/,
        resize: textureSize ? [textureSize, textureSize] : undefined,
      }),
      // HINT: do not convert mask texture to webp. It will get pre multiplied by alpha and may loose rgb masking values
    )
  } else if (textureSize) {
    transforms.push(
      textureCompress({
        encoder: sharp,
        resize: textureSize ? [textureSize, textureSize] : undefined,
      }),
    )
  }

  const io = await gltfIO()
  const doc = await io.read(input)

  doc.setLogger(logger)
  await doc.transform(...transforms)

  if (path.extname(output) === '.glb') {
    await writeGlb(doc, output)
  } else {
    await writeGltf(doc, output, embedData)
  }
}
