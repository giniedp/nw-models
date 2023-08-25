import 'babylonjs'
import { BABYLON } from 'babylonjs-viewer'
import { DyeLoaderExtension } from './dye-loader-extension'

const NAME = 'DyeMaterialPlugin'

BABYLON.RegisterMaterialPlugin(NAME, (material) => {
  const instance = new DyeMaterialPlugin(material)
  DyeMaterialPlugin.setPlugin(material, instance)
  return instance
})

export class DyeMaterialPlugin extends BABYLON.MaterialPluginBase {
  public static getPlugin(material: BABYLON.Material | null): DyeMaterialPlugin | null {
    return (material as any)?.[NAME] || null
  }

  public static setPlugin(material: BABYLON.Material, plugin: DyeMaterialPlugin) {
    Object.assign(material, {
      [NAME]: plugin,
    })
  }

  public dyeColorR = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0)
  public dyeColorG = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0)
  public dyeColorB = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0)
  public dyeColorA = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0)
  public get dyeMaskTexture() {
    return DyeLoaderExtension.getMaskTexture(this._material)
  }

  public get isEnabled() {
    return this._isEnabled
  }
  public set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return
    }
    this._isEnabled = enabled
    this.markAllDefinesAsDirty()
    this._enable(this._isEnabled)
  }

  public get debugMask() {
    return this._debugMask
  }
  public set debugMask(value) {
    if (this._debugMask === value) {
      return
    }
    this._debugMask = value
    this.markAllDefinesAsDirty()
  }

  public updateReflectivity(color: BABYLON.Color4 = this.dyeColorA) {
    const pbr = this._material as BABYLON.PBRMaterial
    if (pbr.reflectivityColor) {
      pbr.reflectivityColor.set(
        1 - color.a + color.r * color.a, 
        1 - color.a + color.g * color.a, 
        1 - color.a + color.b * color.a, 
      );
    }
  }

  private _isEnabled = false
  private _debugMask = false

  public constructor(material: BABYLON.Material) {
    super(material, 'Dye', 200, {
      NW_DYE_ENABLED: false,
      NW_DYE_DEBUG: false,
    })
  }

  public override getClassName() {
    return NAME
  }

  // we use the define to enable or disable the plugin.
  public override prepareDefines(defines: BABYLON.MaterialDefines, scene: BABYLON.Scene, mesh: BABYLON.AbstractMesh) {
    defines.NW_DYE_ENABLED = this._isEnabled
    defines.NW_DYE_DEBUG = this._debugMask
  }

  // here we can define any uniforms to be passed to the shader code.
  public override getUniforms() {
    return {
      ubo: [
        { name: 'dyeColorR', size: 4, type: 'vec4' },
        { name: 'dyeColorG', size: 4, type: 'vec4' },
        { name: 'dyeColorB', size: 4, type: 'vec4' },
        { name: 'dyeColorA', size: 4, type: 'vec4' },
      ],
      fragment: `
        #ifdef NW_DYE_ENABLED
          uniform vec4 dyeColorR;
          uniform vec4 dyeColorG;
          uniform vec4 dyeColorB;
          uniform vec4 dyeColorA;
        #endif
        `,
    }
  }

  public override getSamplers(samplers: string[]) {
    samplers.push('dyeMask')
  }

  // whenever a material is bound to a mesh, we need to update the uniforms.
  // so bind our uniform variable to the actual color we have in the instance.
  public override bindForSubMesh(
    uniformBuffer: BABYLON.UniformBuffer,
    scene: BABYLON.Scene,
    engine: BABYLON.Engine,
    subMesh: BABYLON.SubMesh,
  ) {
    if (this._isEnabled) {
      uniformBuffer.updateColor4('dyeColorR', this.dyeColorR, this.dyeColorR.a)
      uniformBuffer.updateColor4('dyeColorG', this.dyeColorG, this.dyeColorG.a)
      uniformBuffer.updateColor4('dyeColorB', this.dyeColorB, this.dyeColorB.a)
      uniformBuffer.updateColor4('dyeColorA', this.dyeColorA, this.dyeColorA.a)
      uniformBuffer.setTexture('dyeMask', this.dyeMaskTexture)
    }
  }

  public override getCustomCode(shaderType: string) {
    if (shaderType === 'vertex') {
      return null
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        uniform sampler2D dyeMask;
      `,
      CUSTOM_FRAGMENT_UPDATE_ALBEDO: `
        #ifdef NW_DYE_ENABLED
          vec4 maskTexture = texture2D(dyeMask, vAlbedoUV);  

          float luminance = dot(surfaceAlbedo.rgb, vec3(0.299, 0.587, 0.114));
          surfaceAlbedo.rgb = mix(surfaceAlbedo.rgb, luminance * dyeColorR.rgb, maskTexture.r * dyeColorR.a);
          surfaceAlbedo.rgb = mix(surfaceAlbedo.rgb, luminance * dyeColorG.rgb, maskTexture.g * dyeColorG.a);
          surfaceAlbedo.rgb = mix(surfaceAlbedo.rgb, luminance * dyeColorB.rgb, maskTexture.b * dyeColorB.a);
          surfaceAlbedo.rgb = mix(surfaceAlbedo.rgb, luminance * dyeColorA.rgb, maskTexture.a * dyeColorA.a);

          #ifdef NW_DYE_DEBUG
          surfaceAlbedo.rgb = mix(maskTexture.rgb, vec3(1.0, 0.0, 1.0), maskTexture.a);
          #endif
        #endif
      `,
    }
  }
}
