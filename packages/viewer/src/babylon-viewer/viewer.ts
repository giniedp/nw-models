import 'babylonjs'
import 'babylonjs-loaders'
import './dye-loader-extension'
import './dye-material-plugin'
import { DefaultViewer, ViewerModel } from 'babylonjs-viewer'
import { writable, derived } from 'svelte/store'
import { DyeMaterialPlugin } from './dye-material-plugin'
import { DyeLoaderExtension } from './dye-loader-extension'
import type { DyeColor } from '../dye-colors'

export interface BabylonViewerOptions {
  el: HTMLElement
  modelUrl: string
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

export type BabylonViewer = ReturnType<typeof showBabylonViewer>
export function showBabylonViewer(options: BabylonViewerOptions) {
  const appearance = writable<AppearanceDyeExtras | null>(null)
  const dyeR = writable<DyeColor | null>(null)
  const dyeG = writable<DyeColor | null>(null)
  const dyeB = writable<DyeColor | null>(null)
  const dyeA = writable<DyeColor | null>(null)
  const debugMask = writable<boolean | null>(null)

  const viewer = new DefaultViewer(options.el, {
    model: {
      rotationOffsetAngle: 0,
      url: new URL(options.modelUrl, location.origin).toString(),
    },
    templates: {
      navBar: {
        html: '<div></div>',
      },
    } as any,
  })

  viewer.onModelLoadedObservable.add((model) => {
    const foundAppearance = model.meshes.map((mesh) => DyeLoaderExtension.getAppearance(mesh.material)).find((it) => !!it)
    appearance.set(foundAppearance)

    derived([appearance, dyeR, dyeG, dyeB, dyeA, debugMask], (it) => it).subscribe(([data, r, g, b, a, debug]) => {
      updateDyeChannel({
        model,
        appearance: data!,
        dyeR: r?.Color || null,
        dyeG: g?.Color || null,
        dyeB: b?.Color || null,
        dyeA: a?.Color || null,
        debugMask: !!debug,
      })
    })
  })

  return {
    appearance,
    dyeR,
    dyeG,
    dyeB,
    dyeA,
    debugMask,
    dispose: () => {
      viewer.dispose()
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
