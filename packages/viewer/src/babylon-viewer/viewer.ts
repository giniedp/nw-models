import 'babylonjs'
import 'babylonjs-loaders'
import './dye-loader-extension'
import './dye-material-plugin'
import { DefaultViewer, ViewerModel } from 'babylonjs-viewer'
import { writable, derived, type Unsubscriber, type Writable } from 'svelte/store'
import { DyeMaterialPlugin } from './dye-material-plugin'
import { DyeLoaderExtension } from './dye-loader-extension'
import type { DyeColor } from '../dye-colors'

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
        .map((mesh) => DyeLoaderExtension.getAppearance(mesh.material))
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

function updateDyeChannel(options: {
  model: ViewerModel
  appearance: AppearanceDyeExtras
  dyeR: string | null
  dyeG: string | null
  dyeB: string | null
  dyeA: string | null
  debugMask: boolean
}) {
  options.model.meshes.forEach((mesh) => {
    const dye = DyeMaterialPlugin.getPlugin(mesh.material)
    if (!dye) {
      return
    }
    if (!options.appearance) {
      dye.isEnabled = false
      return
    }
    dye.isEnabled = true
    dye.debugMask = options.debugMask
    if (options.dyeR) {
      const rgb = hexToRgb(options.dyeR)
      dye.dyeColorR.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskRDye)
    } else {
      dye.dyeColorR.set(0, 0, 0, 0)
    }
    if (options.dyeG) {
      const rgb = hexToRgb(options.dyeG)
      dye.dyeColorG.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskGDye)
    } else {
      dye.dyeColorG.set(0, 0, 0, 0)
    }
    if (options.dyeB) {
      const rgb = hexToRgb(options.dyeB)
      dye.dyeColorB.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskBDye)
    } else {
      dye.dyeColorB.set(0, 0, 0, 0)
    }
    if (options.dyeA) {
      const rgb = hexToRgb(options.dyeA)
      dye.dyeColorA.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskASpecDye)
    } else {
      dye.dyeColorA.set(0, 0, 0, 0)
    }
    dye.updateReflectivity()
  })
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
