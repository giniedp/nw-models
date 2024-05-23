import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core'

import { EXT_NEW_WORLD_APPEARANCE } from './constants'
import { NwAppearanceProperties } from './properties'

interface NwAppearanceDef {
  data: any
  maskTexture: GLTF.ITextureInfo
}

export class NwAppearanceExtension extends Extension {
  public readonly extensionName = EXT_NEW_WORLD_APPEARANCE
  public static readonly EXTENSION_NAME = EXT_NEW_WORLD_APPEARANCE

  public createProps(): NwAppearanceProperties {
    return new NwAppearanceProperties(this.document.getGraph())
  }

  public read(context: ReaderContext): this {
    const jsonDoc = context.jsonDoc
    const materialDefs = jsonDoc.json.materials || []
    const textureDefs = jsonDoc.json.textures || []
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[this.extensionName]) {
        const props = this.createProps()
        context.materials[materialIndex].setExtension(this.extensionName, props)

        const appearanceDef = materialDef.extensions[this.extensionName] as NwAppearanceDef

        if (appearanceDef.data !== undefined) {
          props.setData(appearanceDef.data)
        }

        if (appearanceDef.maskTexture !== undefined) {
          const textureInfoDef = appearanceDef.maskTexture
          const texture = context.textures[textureDefs[textureInfoDef.index].source!]
          props.setMaskTexture(texture)
          context.setTextureInfo(props.getMaskTextureInfo()!, textureInfoDef)
        }
      }
    })

    return this
  }

  public write(context: WriterContext): this {
    const jsonDoc = context.jsonDoc
    for (const material of this.document.getRoot().listMaterials()) {
      const appearance = material.getExtension<NwAppearanceProperties>(this.extensionName)
      if (!appearance) {
        return
      }

      const materialIndex = context.materialIndexMap.get(material)
      const materialDef = jsonDoc.json.materials[materialIndex]
      materialDef.extensions = materialDef.extensions || {}

      const appearanceDef = (materialDef.extensions[this.extensionName] = {} as NwAppearanceDef)

      if (appearance.getData()) {
        appearanceDef.data = appearance.getData()
      }
      if (appearance.getMaskTexture()) {
        const texture = appearance.getMaskTexture()
        const textureInfo = appearance.getMaskTextureInfo()
        appearanceDef.maskTexture = context.createTextureInfoDef(texture, textureInfo)
      }
    }

    return this
  }
}
