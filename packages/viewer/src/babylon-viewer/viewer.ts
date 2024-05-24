import 'babylonjs'
import 'babylonjs-loaders'
import { DefaultViewer, ViewerModel } from 'babylonjs-viewer'
import { derived, type Unsubscriber, type Writable } from 'svelte/store'
import type { DyeColor } from '../dye-colors'
import './nw-overlay-mask-extension'
import { NwOverlayMaskExtension } from './nw-overlay-mask-extension'
import './nw-overlay-mask-plugin'
import { NwOverlayMaskPlugin } from './nw-overlay-mask-plugin'

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

export type Viewer = ReturnType<typeof initViewer>
export function initViewer({ el, modelUrl, dyeR, dyeG, dyeB, dyeA, debugMask, appearance }: BabylonViewerOptions) {
  const viewer = new DefaultViewer(el, {
    templates: {
      navBar: null,
    } as any,
    // scene: {
    //   clearColor: {
    //     r: 0,
    //     g: 0,
    //     b: 0,
    //     a: 0,
    //   },
    // },
  })

  async function showModel(modelUrl: string) {
    await viewer.hideOverlayScreen().catch(console.warn)
    return viewer
      .loadModel({
        url: modelUrl,
        rotationOffsetAngle: 0,
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
        .map((mesh) => NwOverlayMaskExtension.getAppearance(mesh.material))
        .find((it) => !!it)
      appearance.set(foundAppearance)

      return derived([appearance, dyeR, dyeG, dyeB, dyeA, debugMask], (it) => it).subscribe(
        ([data, r, g, b, a, debug]) => {
          updateDyeChannel({
            model,
            appearance: data!,
            dyeR: r?.Color || null,
            dyeG: g?.Color || null,
            dyeB: b?.Color || null,
            dyeA: a?.Color || null,
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
  }
}

function updateDyeChannel({
  model,
  appearance,
  dyeR,
  dyeG,
  dyeB,
  dyeA,
  debugMask,
}: {
  model: ViewerModel
  appearance: AppearanceDyeExtras
  dyeR: string | null
  dyeG: string | null
  dyeB: string | null
  dyeA: string | null
  debugMask: boolean
}) {
  for (const mesh of model.meshes) {
    const mtl = NwOverlayMaskPlugin.getPlugin(mesh.material)
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
      dye: appearance.MaskRDye ?? appearance.MaskR ?? 0,
      dyeOverride: appearance.MaskRDyeOverride ?? appearance.MaskROverride ?? 0,
      dyeColor: dyeR,
      mask: appearance.MaskR ?? 0,
      maskOverride: appearance.MaskROverride ?? 0,
      maskColor: appearance.MaskRColor,
    })
    mtl.nwMaskR = maskR.mask
    mtl.nwMaskROverride = maskR.maskOverride
    mtl.nwMaskRColor = maskR.maskColor

    const maskG = getMaskSettings({
      dye: appearance.MaskGDye ?? appearance.MaskG ?? 0,
      dyeOverride: appearance.MaskGDyeOverride ?? appearance.MaskGOverride ?? 0,
      dyeColor: dyeG,
      mask: appearance.MaskG ?? 0,
      maskOverride: appearance.MaskGOverride ?? 0,
      maskColor: appearance.MaskGColor,
    })
    mtl.nwMaskG = maskG.mask
    mtl.nwMaskGOverride = maskG.maskOverride
    mtl.nwMaskGColor = maskG.maskColor

    const maskB = getMaskSettings({
      dye: appearance.MaskBDye ?? appearance.MaskB ?? 0,
      dyeOverride: appearance.MaskBDyeOverride ?? appearance.MaskBOverride ?? 0,
      dyeColor: dyeB,
      mask: appearance.MaskB ?? 0,
      maskOverride: appearance.MaskBOverride ?? 0,
      maskColor: appearance.MaskBColor,
    })
    mtl.nwMaskB = maskB.mask
    mtl.nwMaskBOverride = maskB.maskOverride
    mtl.nwMaskBColor = maskB.maskColor

    const maskA = getMaskSettings({
      dye: appearance.MaskASpecDye ?? appearance.MaskASpec ?? 0,
      dyeOverride: appearance.MaskASpecDye ?? appearance.MaskASpec ?? 0,
      dyeColor: dyeA,
      mask: appearance.MaskASpec ?? 0,
      maskOverride: appearance.MaskASpec ?? 0,
      maskColor: appearance.MaskASpecColor,
    })
    mtl.nwMaskASpecOverride = maskA.mask
    mtl.nwMaskASpec = maskA.maskColor
    //mtl.updateReflectivity()
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
