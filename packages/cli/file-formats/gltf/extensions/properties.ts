import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureChannel, TextureInfo } from '@gltf-transform/core'
import { EXT_NEW_WORLD_APPEARANCE } from './constants'

interface INwAppearance extends IProperty {
  data: any
  maskTexture: Texture
  maskTextureInfo: TextureInfo
}

export class NwAppearanceProperties extends ExtensionProperty<INwAppearance> {
  public static EXTENSION_NAME = EXT_NEW_WORLD_APPEARANCE
  public declare extensionName: typeof EXT_NEW_WORLD_APPEARANCE
  public declare propertyType: 'appearance'
  public declare parentTypes: [PropertyType.MATERIAL]

  protected init(): void {
    this.extensionName = EXT_NEW_WORLD_APPEARANCE
    this.propertyType = 'appearance'
    this.parentTypes = [PropertyType.MATERIAL]
  }

  protected getDefaults(): Nullable<INwAppearance> {
    const ti = new TextureInfo(this.graph, 'textureInfo')
    ti.setMinFilter(9986)
    ti.setMagFilter(9729)
    ti.setWrapT(10497)
    ti.setWrapS(10497)
    return Object.assign(super.getDefaults() as IProperty, {
      data: null,
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

  public getData(): any {
    return this.get('data')
  }

  public setData(data: any): this {
    return this.set('data', data)
  }
}
