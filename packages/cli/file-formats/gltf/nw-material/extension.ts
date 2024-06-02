import { Extension, GLTF, ReaderContext, WriterContext } from '@gltf-transform/core'

import { NwMaterialProperty } from './properties'
import { EXT_NW_MATERIAL } from './constants'

export interface NwMaterialInfo {
  params: Record<string, any>
  maskTexture: GLTF.ITextureInfo
}

export class NwMaterialExtension extends Extension {
  public readonly extensionName = EXT_NW_MATERIAL
  public static readonly EXTENSION_NAME = EXT_NW_MATERIAL

  public createProps(): NwMaterialProperty {
    return new NwMaterialProperty(this.document.getGraph())
  }

  public read(context: ReaderContext): this {
    const jsonDoc = context.jsonDoc
    const materialDefs = jsonDoc.json.materials || []
    const textureDefs = jsonDoc.json.textures || []
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[this.extensionName]) {
        const props = this.createProps()
        context.materials[materialIndex].setExtension(this.extensionName, props)

        const info = materialDef.extensions[this.extensionName] as NwMaterialInfo
        if (info.params != null) {
          props.setParams(info.params)
        }
        if (info.maskTexture != null) {
          const textureInfoDef = info.maskTexture
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
      const prop = material.getExtension<NwMaterialProperty>(this.extensionName)
      if (!prop) {
        return
      }

      const materialIndex = context.materialIndexMap.get(material)
      const materialDef = jsonDoc.json.materials[materialIndex]
      materialDef.extensions = materialDef.extensions || {}
      const info: NwMaterialInfo = {
        params: null,
        maskTexture: null,
      }
      if (prop.getParams()) {
        info.params = prop.getParams()
      }
      if (prop.getMaskTexture()) {
        const texture = prop.getMaskTexture()
        const textureInfo = prop.getMaskTextureInfo()
        info.maskTexture = context.createTextureInfoDef(texture, textureInfo)
      }
      materialDef.extensions[this.extensionName] = info
    }

    return this
  }
}
