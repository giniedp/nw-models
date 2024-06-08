import 'babylonjs'
import 'babylonjs-loaders'
import { DefaultViewer, ViewerModel } from 'babylonjs-viewer'
import { derived, type Unsubscriber, type Writable } from 'svelte/store'
import type { DyeColor } from '../dye-colors'
import './nw-material-extension'
import { NwMaterialExtension } from './nw-material-extension'
import './nw-material-plugin'
import { NwMaterialPlugin, registerNwMaterialPlugin } from './nw-material-plugin'

registerNwMaterialPlugin()
export interface BabylonViewerOptions {
  el: HTMLElement
  modelUrl: string

  dyeR: Writable<DyeColor | null>
  dyeG: Writable<DyeColor | null>
  dyeB: Writable<DyeColor | null>
  dyeA: Writable<DyeColor | null>
  debugMask: Writable<boolean | null>
  appearance: Writable<AppearanceDyeExtras | null>
}

export interface AppearanceDyeExtras {
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

  MaskR: number
  MaskROverride: number
  MaskRColor: string
  MaskG: number
  MaskGOverride: number
  MaskGColor: string
  MaskB: number
  MaskBOverride: number
  MaskBColor: string
  MaskASpec: number
  MaskASpecColor: string
  MaskAGloss: number
  MaskAGlossShift: number
  EmissiveColor: string
  EmissiveIntensity: number
}

export interface DyeChannel {
  color: string
  enabled: boolean
}

function disposer() {
  let list: Unsubscriber[] = []
  return {
    dispose: () => {
      const toDispose = list
      list = []
      for (const it of toDispose) {
        it()
      }
    },
    add: (fn: () => Unsubscriber) => {
      list.push(fn())
    },
  }
}

function viewerSetLightMode(viewer: DefaultViewer) {
  const skyMat = viewer.sceneManager.environmentHelper?.skyboxMaterial
  const gndMat = viewer.sceneManager.environmentHelper?.groundMaterial
  if (skyMat) {
    skyMat.alpha = 1
  }
  if (gndMat) {
    gndMat.alpha = 0.4
  }
  viewer.sceneManager.bloomEnabled = true
  viewer.sceneManager.scene.environmentIntensity = 1
  const pipeline = viewer.sceneManager.defaultRenderingPipeline
  if (pipeline) {
    pipeline.imageProcessing.contrast = 1.5
  }
}

function viewerSetDarkMode(viewer: DefaultViewer) {
  const skyMat = viewer.sceneManager.environmentHelper?.skyboxMaterial
  const gndMat = viewer.sceneManager.environmentHelper?.groundMaterial
  if (skyMat) {
    skyMat.alpha = 0
  }
  if (gndMat) {
    gndMat.alpha = 0
  }
  viewer.sceneManager.bloomEnabled = false
  viewer.sceneManager.scene.environmentIntensity = 1
  const pipeline = viewer.sceneManager.defaultRenderingPipeline
  if (pipeline) {
    pipeline.imageProcessing.contrast = 2
  }
}

export type Viewer = ReturnType<typeof initViewer>
export function initViewer({ el, modelUrl, dyeR, dyeG, dyeB, dyeA, debugMask, appearance }: BabylonViewerOptions) {
  const viewer = new DefaultViewer(el, {
    engine: {
      antialiasing: true,
      hdEnabled: true,
      adaptiveQuality: true,
    },
    scene: {
      clearColor: {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
      },
    },
    ground: {
      opacity: 0,
    },
    templates: {
      navBar: null,
      loadingScreen: null,
    } as any,
    camera: {
      behaviors: {
        autoRotate: false,
        bouncing: false,
      },
    },
  })
  viewer.onSceneInitObservable.add((scene) => {
    viewerSetLightMode(viewer)
  })

  async function showModel(modelUrl: string) {
    await viewer.hideOverlayScreen().catch(console.warn)
    return viewer
      .loadModel({
        url: modelUrl,
        rotationOffsetAngle: Math.PI,
      })
      .catch((err) => {
        console.error(err)
        return null
      })
      .then(() => {
        // viewer.sceneManager.scene.debugLayer.show()
        // const skyMat = viewer.sceneManager.environmentHelper?.skyboxMaterial
        // const groundMat = viewer.sceneManager.environmentHelper?.groundMaterial
        // if (groundMat) {
        //   groundMat.primaryColor = new BABYLON.Color3(1, 0, 0)
        //   groundMat.primaryColorHighlightLevel = 0.1
        // }
        // if (skyMat) {
        //   skyMat.primaryColor = new BABYLON.Color3(1, 1, 1)
        //   skyMat.primaryColorHighlightLevel = 0
        // }
        // viewer.sceneManager.scene.lights.forEach((it) => {
        //   it.setEnabled(false)
        // })
      })
  }

  const disposables = disposer()

  viewer.onEngineInitObservable.add((engine) => {
    console.log(viewer)
    showModel(modelUrl)
  })
  viewer.onModelLoadedObservable.add((model) => {
    disposables.dispose()
    disposables.add(() => {
      const foundAppearance = model.meshes
        .map((mesh) => NwMaterialExtension.getAppearance(mesh.material))
        .find((it) => !!it)
      appearance.set(foundAppearance)

      return derived([appearance, dyeR, dyeG, dyeB, dyeA, debugMask], (it) => it).subscribe(
        ([data, r, g, b, a, debug]) => {
          updateDyeChannel({
            model,
            appearance: data!,
            dyeR: r?.ColorAmount,
            dyeROverride: r?.ColorOverride,
            dyeRColor: r?.Color,

            dyeG: g?.ColorAmount,
            dyeGOverride: g?.ColorOverride,
            dyeGColor: g?.Color,

            dyeB: b?.ColorAmount,
            dyeBOverride: b?.ColorOverride,
            dyeBColor: b?.Color,

            dyeA: a?.SpecAmount,
            // dyeAOverride:
            dyeAColor: a?.SpecColor,
            glossShift: a?.MaskGlossShift,

            debugMask: !!debug,
          })
        },
      )
    })
  })

  return {
    showModel: showModel,
    dispose: () => {
      viewer.dispose()
      disposables.dispose()
    },
    captureScreenshot: async () => {
      const engine = viewer.engine
      const scene = viewer.sceneManager.scene
      const camera = scene.activeCamera
      return BABYLON.Tools.CreateScreenshotAsync(engine as any, camera as any, { width: 1200, precision: 1 })
      //navigator.clipboard.write(new ClipboardItem({ 'image/png': result }))
    },
  }
}

function updateDyeChannel({
  model,
  appearance,
  dyeR,
  dyeROverride,
  dyeRColor,
  dyeG,
  dyeGOverride,
  dyeGColor,
  dyeB,
  dyeBOverride,
  dyeBColor,
  dyeA,
  dyeAOverride,
  dyeAColor,
  glossShift,
  debugMask,
}: {
  model: ViewerModel
  appearance: AppearanceDyeExtras
  dyeR?: number
  dyeROverride?: number
  dyeRColor?: string
  dyeG?: number
  dyeGOverride?: number
  dyeGColor?: string
  dyeB?: number
  dyeBOverride?: number
  dyeBColor?: string
  dyeA?: number
  dyeAOverride?: number
  dyeAColor?: string
  glossShift?: number
  debugMask: boolean
}) {
  for (const mesh of model.meshes) {
    const mtl = NwMaterialPlugin.getPlugin(mesh.material)
    if (!mtl) {
      continue
    }

    if (!appearance) {
      mtl.isEnabled = false
      return
    }

    mtl.isEnabled = true
    mtl.debugMask = debugMask

    const maskR = getMaskSettings({
      dye: dyeR ?? appearance.MaskRDye ?? appearance.MaskR ?? 0,
      dyeOverride: dyeROverride ?? appearance.MaskRDyeOverride ?? appearance.MaskROverride ?? 0,
      dyeColor: dyeRColor ?? null,
      mask: appearance.MaskR ?? 0,
      maskOverride: appearance.MaskROverride ?? 0,
      maskColor: appearance.MaskRColor,
    })
    mtl.nwMaskR = maskR.mask
    mtl.nwMaskROverride = maskR.maskOverride
    mtl.nwMaskRColor = maskR.maskColor

    const maskG = getMaskSettings({
      dye: dyeG ?? appearance.MaskGDye ?? appearance.MaskG ?? 0,
      dyeOverride: dyeGOverride ?? appearance.MaskGDyeOverride ?? appearance.MaskGOverride ?? 0,
      dyeColor: dyeGColor ?? null,
      mask: appearance.MaskG ?? 0,
      maskOverride: appearance.MaskGOverride ?? 0,
      maskColor: appearance.MaskGColor,
    })
    mtl.nwMaskG = maskG.mask
    mtl.nwMaskGOverride = maskG.maskOverride
    mtl.nwMaskGColor = maskG.maskColor

    const maskB = getMaskSettings({
      dye: dyeB ?? appearance.MaskBDye ?? appearance.MaskB ?? 0,
      dyeOverride: dyeBOverride ?? appearance.MaskBDyeOverride ?? appearance.MaskBOverride ?? 0,
      dyeColor: dyeBColor ?? null,
      mask: appearance.MaskB ?? 0,
      maskOverride: appearance.MaskBOverride ?? 0,
      maskColor: appearance.MaskBColor,
    })
    mtl.nwMaskB = maskB.mask
    mtl.nwMaskBOverride = maskB.maskOverride
    mtl.nwMaskBColor = maskB.maskColor

    const maskA = getMaskSettings({
      dye: dyeA ?? appearance.MaskASpecDye ?? appearance.MaskASpec ?? 0,
      dyeOverride: dyeAOverride ?? appearance.MaskASpecDye ?? appearance.MaskASpec ?? 0,
      dyeColor: dyeAColor ?? null,
      mask: appearance.MaskASpec ?? 0,
      maskOverride: appearance.MaskASpec ?? 0,
      maskColor: appearance.MaskASpecColor,
    })
    mtl.nwMaskASpecOverride = maskA.mask
    mtl.nwMaskASpec = maskA.maskColor
    mtl.nwMaskGlossShift = glossShift ?? appearance.MaskAGlossShift ?? 0.5
    mtl.nwMaskGloss = appearance.MaskAGloss ?? 0
  }
}

function parseColor(color: string) {
  color = (color || '').toLowerCase()
  if (/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/.test(color)) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/.exec(color)
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    }
  }
  if (color.includes(',')) {
    const [r, g, b] = color.split(',').map((it) => parseFloat(it))
    return {
      r: r,
      g: g,
      b: b,
    }
  }
  return {
    r: 0,
    g: 0,
    b: 0,
  }
}

function getMaskSettings(options: {
  dye: number
  dyeOverride: number
  dyeColor: string | null
  mask: number
  maskOverride: number
  maskColor: string | null
}) {
  if (options.dye && options.dyeColor) {
    const rgb = parseColor(options.dyeColor)
    return {
      mask: options.dye || 0,
      maskOverride: options.dyeOverride || 0,
      maskColor: {
        r: rgb.r || 0,
        g: rgb.g || 0,
        b: rgb.b || 0,
      },
    }
  }
  if (options.mask && options.maskColor) {
    const rgb = parseColor(options.maskColor)
    return {
      mask: options.mask || 0,
      maskOverride: options.maskOverride || 0,
      maskColor: {
        r: rgb.r || 0,
        g: rgb.g || 0,
        b: rgb.b || 0,
      },
    }
  }
  return {
    mask: 0,
    maskOverride: 0,
    maskColor: {
      r: 0,
      g: 0,
      b: 0,
    },
  }
}
