import { Document, FileUtils, ImageUtils, Texture, Transform } from '@gltf-transform/core'
import { KHRTextureBasisu } from '@gltf-transform/extensions'
import { createTransform, getTextureChannelMask, listTextureSlots } from '@gltf-transform/functions'
import { ktxCreate } from '../../../tools/ktx-create'

export interface ToKtxOptions {
  matcher: Array<{
    slots: RegExp
    args: string[]
  }>
}

export function toktx(options: ToKtxOptions): Transform {
  return createTransform('toktx', async (doc: Document): Promise<void> => {
    const logger = doc.getLogger()
    const textures = doc.getRoot().listTextures()
    const basisuExtension = doc.createExtension(KHRTextureBasisu).setRequired(true)
    let srcBytes = 0
    let dstBytes = 0
    for (const texture of textures) {
      const slots = listTextureSlots(texture)
      const textureIndex = textures.indexOf(texture)
      const textureLabel = texture.getURI() || texture.getName() || `${textureIndex + 1}/${textures.length}`
      const prefix = `ktx:texture(${textureLabel})`
      logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`)

      if (texture.getMimeType() === 'image/ktx2') {
        logger.debug(`${textureLabel}: Skipping, already KTX.`)
        continue
      }
      if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
        logger.warn(`${textureLabel}: Skipping, unsupported texture type "${texture.getMimeType()}".`)
        continue
      }
      const args = options.matcher.find((it) => slots.some((slot) => slot.match(it.slots)))?.args
      if (!args) {
        logger.debug(`${textureLabel}: Skipping, excluded by matcher.`)
        continue
      }
      const res = await processTexture({
        doc,
        texture,
        textureLabel,
        args,
      })
      srcBytes += res.srcByteLength
      dstBytes += res.dstByteLength
    }
    logger.debug(`ktx: ${formatBytes(srcBytes)} → ${formatBytes(dstBytes)}`)
    const usesKTX2 = doc
      .getRoot()
      .listTextures()
      .some((t) => t.getMimeType() === 'image/ktx2')

    if (!usesKTX2) {
      basisuExtension.dispose()
    }
  })
}

export async function processTexture({
  doc,
  texture,
  textureLabel,
  args,
}: {
  doc: Document
  texture: Texture
  textureLabel: string
  args: string[]
}) {
  const logger = doc.getLogger()
  const prefix = `ktx:texture(${textureLabel})`

  const srcURI = texture.getURI()
  const srcMimeType = texture.getMimeType()
  const dstMimeType = 'image/ktx2'

  const srcImage = texture.getImage()!
  const dstImage = await ktxCreate({
    input: Buffer.from(srcImage),
    output: null,
    args: args,
  }).then((it) => it as Buffer)

  const srcByteLength = srcImage.byteLength
  const dstByteLength = dstImage.byteLength
  logger.debug(`${prefix}: ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}`)

  const srcExtension = srcURI ? FileUtils.extension(srcURI) : ImageUtils.mimeTypeToExtension(srcMimeType)
  const dstExtension = ImageUtils.mimeTypeToExtension(dstMimeType)
  const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`)
  texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI)
  return {
    srcByteLength,
    dstByteLength,
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
