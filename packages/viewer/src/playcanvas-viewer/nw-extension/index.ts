import type { StandardMaterial, Texture } from "playcanvas"
import { diffusePS } from "./diffuse"

export const EXT_new_world_appearance = 'EXT_new_world_appearance'

export interface ExtensionMetadata {
  data: AppearanceMetadata
  maskTexture: {
    index: number
  }
}

export interface AppearanceMetadata {
  MaskRDyeOverride: number
  MaskRDye: number
  MaskGDyeOverride: number
  MaskGDye: number
  MaskBDyeOverride: number
  MaskBDye: number
  MaskASpecDye: number
  RDyeSlotDisabled: string
  GDyeSlotDisabled: string
  BDyeSlotDisabled: string
  ADyeSlotDisabled: string
}

function attachToMaterial(gltfMtl: any, mtl: StandardMaterial, textures: Texture[]) {
  const meta = getExtensionMetadata(gltfMtl.extensions)
  if (!meta) {
    return
  }
  if (meta.data) {
    setAppearance(mtl, meta.data)
  }
  if (meta.maskTexture) {
    const texture = textures[meta.maskTexture.index];
    setMaskTexture(mtl, texture)
    // extractTextureTransform(texture, material, ['diffuse', 'opacity']);
    mtl.chunks.diffusePS = diffusePS
  }
}

function getExtensionMetadata(it: any): ExtensionMetadata | null {
  return it[EXT_new_world_appearance] || null
}

function getMaskTexture(it: StandardMaterial): Texture | null {
  return (it as any).nwMaskTexture || null
}
function setMaskTexture(it: StandardMaterial, tex: Texture) {
  (it as any).nwMaskTexture = tex
}

function getAppearance(it: StandardMaterial): AppearanceMetadata | null {
  return (it as any).nwAppearance || null
}
function setAppearance(it: StandardMaterial, tex: AppearanceMetadata) {
  (it as any).nwAppearance = tex
}

function setParam(mtl: StandardMaterial, name: string, value: number | number[] | Float32Array | Texture) {
  mtl.setParameter(name, value)
}

function setParamDyeR(mtl: StandardMaterial, value: number[]) {
  setParam(mtl, 'dyeColorR', value)
}
function setParamDyeG(mtl: StandardMaterial, value: number[]) {
  setParam(mtl, 'dyeColorG', value)
}
function setParamDyeB(mtl: StandardMaterial, value: number[]) {
  setParam(mtl, 'dyeColorB', value)
}
function setParamDyeA(mtl: StandardMaterial, value: number[]) {
  setParam(mtl, 'dyeColorA', value)
}
function setParamTexture(mtl: StandardMaterial, value: Texture) {
  setParam(mtl, 'dyeMask', value)
}
function setParams(mtl: StandardMaterial, { enabled, debug }: { enabled: boolean, debug: boolean }) {
  setParam(mtl, 'dyeParams', [
    enabled ? 1 : 0,
    debug ? 1 : 0,
  ])
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    }
  }
  return {
    r: 0,
    g: 0,
    b: 0,
  }
}

function updateMaterial(mtl: StandardMaterial, options: {
  appearance?: AppearanceMetadata
  dyeR?: string
  dyeG?: string
  dyeB?: string
  dyeA?: string
  debugMask?: boolean
}) {
  const texture = getMaskTexture(mtl)
  if (!texture) {
    return
  }

  setParamTexture(mtl, texture)
  setParams(mtl, {
    enabled: !!options.appearance,
    debug: !!options.debugMask
  })

  if (!options.appearance) {
    return
  }

  if (options.dyeR) {
    const rgb = hexToRgb(options.dyeR)
    setParamDyeR(mtl, [rgb.r, rgb.g, rgb.b, options.appearance.MaskRDye])
  } else {
    setParamDyeR(mtl, [0, 0, 0, 0])
  }
  if (options.dyeG) {
    const rgb = hexToRgb(options.dyeG)
    setParamDyeG(mtl, [rgb.r, rgb.g, rgb.b, options.appearance.MaskGDye])
  } else {
    setParamDyeG(mtl, [0, 0, 0, 0])
  }
  if (options.dyeB) {
    const rgb = hexToRgb(options.dyeB)
    setParamDyeB(mtl, [rgb.r, rgb.g, rgb.b, options.appearance.MaskBDye])
  } else {
    setParamDyeB(mtl, [0, 0, 0, 0])
  }
  if (options.dyeA) {
    const rgb = hexToRgb(options.dyeA)
    setParamDyeA(mtl, [rgb.r, rgb.g, rgb.b, options.appearance.MaskASpecDye])
  } else {
    setParamDyeA(mtl, [0, 0, 0, 0])
  }


  // const pbr = this._material as BABYLON.PBRMaterial
  // if (pbr.reflectivityColor) {
  //   pbr.reflectivityColor.set(
  //     1 - color.a + color.r * color.a,
  //     1 - color.a + color.g * color.a,
  //     1 - color.a + color.b * color.a,
  //   );
  // }
}
export const NwExtension = {
  attachToMaterial,
  getExtensionMetadata,
  getMaskTexture,
  setMaskTexture,
  getAppearance,
  setAppearance,
  updateMaterial
}
