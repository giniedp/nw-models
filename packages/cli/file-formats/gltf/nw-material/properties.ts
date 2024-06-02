import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureChannel, TextureInfo } from '@gltf-transform/core'
import { EXT_NW_MATERIAL } from './constants'

export interface INwMaterialProperty extends IProperty {
  params: Record<string, any>
  maskTexture: Texture
  maskTextureInfo: TextureInfo
}

export class NwMaterialProperty extends ExtensionProperty<INwMaterialProperty> {
  public static EXTENSION_NAME = EXT_NW_MATERIAL
  public declare extensionName: typeof EXT_NW_MATERIAL
  public declare propertyType: 'NewWorldMaterial'
  public declare parentTypes: [PropertyType.MATERIAL]

  protected init(): void {
    this.extensionName = EXT_NW_MATERIAL
    this.propertyType = 'NewWorldMaterial'
    this.parentTypes = [PropertyType.MATERIAL]
  }

  protected getDefaults(): Nullable<INwMaterialProperty> {
    const ti = new TextureInfo(this.graph, 'textureInfo')
    ti.setMinFilter(9986)
    ti.setMagFilter(9729)
    ti.setWrapT(10497)
    ti.setWrapS(10497)
    return Object.assign(super.getDefaults() as IProperty, {
      params: null,
      maskTexture: null,
      maskTextureInfo: ti,
    })
  }

  public getMaskTexture(): Texture | null {
    return this.getRef('maskTexture')
  }

  public setMaskTexture(texture: Texture | null): this {
    return this.setRef('maskTexture', texture, { channels: TextureChannel.R | TextureChannel.G | TextureChannel.B | TextureChannel.A })
  }

  public getMaskTextureInfo(): TextureInfo | null {
    return this.getRef('maskTexture') ? this.getRef('maskTextureInfo') : null
  }

  public getParams(): Record<string, any> {
    return this.get('params')
  }

  public setParams(params: Record<string, any>): this {
    return this.set('params', params)
  }
}
