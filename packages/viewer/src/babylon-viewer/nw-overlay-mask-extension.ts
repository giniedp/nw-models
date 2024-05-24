import 'babylonjs'
import 'babylonjs-loaders'
import { BABYLON, GLTF2 } from 'babylonjs-viewer'

const NAME = 'NwOverlayMaskExtension'

GLTF2.GLTFLoader.RegisterExtension(NAME, (loader) => {
  return new NwOverlayMaskExtension(loader)
})

export class NwOverlayMaskExtension implements GLTF2.IGLTFLoaderExtension {
  public static getMaskTexture(object: any): BABYLON.BaseTexture | null {
    return object?.maskTexture
  }
  public static setMaskTexture(object: any, texture: BABYLON.BaseTexture | null) {
    object.maskTexture = texture
  }

  public static getAppearance(object: any): any | null {
    return object?.dyeAppearance
  }
  public static setAppearance(object: any, value: any | null) {
    object.dyeAppearance = value
  }

  public name: string = NAME
  public enabled: boolean = true
  public order = 200
  private loader: GLTF2.GLTFLoader
  public constructor(loader: GLTF2.GLTFLoader) {
    this.loader = loader
  }

  public dispose(): void {
    this.loader = null!
  }

  async _loadMaterialAsync?(
    context: string,
    material: GLTF2.IMaterial,
    babylonMesh: BABYLON.Mesh | null,
    babylonDrawMode: number,
    assign: (babylonMaterial: BABYLON.Material) => void,
  ): Promise<BABYLON.Material> {

    const ext = material?.extensions?.EXT_nw_overlay_mask
    const appearance = ext?.data
    let maskTextureInfo = ext?.maskTexture as GLTF2.ITextureInfo
    let maskTexture: BABYLON.BaseTexture | null

    // HACK:
    //   calling loadTextureInfoAsync here produces an infinite loop, yet i can not find a way to load a texture otherwise
    //   abuse the mesh to hold the mask texture and prevent infinite loop
    const marker = 'skipMaskTexture'
    maskTexture = NwOverlayMaskExtension.getMaskTexture(babylonMesh)

    if (!maskTexture && (maskTextureInfo?.index >= 0) && !((babylonMesh as any)[marker])) {
      maskTexture = await this.loader
        .loadTextureInfoAsync(`${context}/maskTexture`, maskTextureInfo, (babylonTexture) => {
          babylonTexture.name = `${material.name}_mask`
        })
        .catch((err) => {
          console.error(err)
          return null
        })
      NwOverlayMaskExtension.setMaskTexture(babylonMesh, maskTexture || null)
      Object.assign(babylonMesh as any, { [marker]: true })
    }

    return this.loader._loadMaterialAsync(context, material, babylonMesh, babylonDrawMode, (babylonMaterial) => {
      if (maskTexture) {
        NwOverlayMaskExtension.setMaskTexture(babylonMaterial, maskTexture || null)
      }
      if (appearance) {
        NwOverlayMaskExtension.setAppearance(babylonMaterial, appearance || null)
      }
      return assign(babylonMaterial)
    })
  }
}
