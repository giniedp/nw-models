import fs from 'node:fs'
import { Document, FileUtils, ImageUtils, Texture } from '@gltf-transform/core'

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
