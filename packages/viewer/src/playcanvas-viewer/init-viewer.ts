import { type Writable } from 'svelte/store'

import type { DyeColor } from '../dye-colors'
import { PlayCanvasViewer } from './viewer'


export interface PcViewerOptions {
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

export type Viewer = ReturnType<typeof initViewer>
export function initViewer({ el, modelUrl }: PcViewerOptions) {

  const canvas = document.createElement('canvas')
  canvas.style.maxWidth = "100%"
  el.appendChild(canvas)

  const viewer = new PlayCanvasViewer(canvas)

  viewer.app.start()
  viewer.app.on('update', function (dt) {
    // if (entity) {
    //   entity.rotate(0, 100 * dt, 0)
    // }
  })
  showModel(modelUrl)

  function showModel(modelUrl: string) {
    viewer.resetScene()
    modelUrl = new URL(modelUrl, location.origin).toString()
    viewer
      .loadGltf(
        {
          filename: 'model.gltf',
          url: modelUrl,
        },
        [],
      )
      .then((asset) => {
        viewer.addToScene(asset)
        console.log(asset)
      })
  }

  return {
    dispose: () => {
      viewer.dispose()
      //   unsub?.()
    },
    showModel
  }
}

function updateDyeChannel(options: {
  //model: ViewerModel
  appearance: AppearanceDyeExtras
  dyeR: string | null
  dyeG: string | null
  dyeB: string | null
  dyeA: string | null
  debugMask: boolean
}) {
  //   options.model.meshes.forEach((mesh) => {
  //     const dye = DyeMaterialPlugin.getPlugin(mesh.material)
  //     if (!dye) {
  //       return
  //     }
  //     if (!options.appearance) {
  //       dye.isEnabled = false
  //       return
  //     }
  //     dye.isEnabled = true
  //     dye.debugMask = options.debugMask
  //     if (options.dyeR) {
  //       const rgb = hexToRgb(options.dyeR)
  //       dye.dyeColorR.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskRDye)
  //     } else {
  //       dye.dyeColorR.set(0, 0, 0, 0)
  //     }
  //     if (options.dyeG) {
  //       const rgb = hexToRgb(options.dyeG)
  //       dye.dyeColorG.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskGDye)
  //     } else {
  //       dye.dyeColorG.set(0, 0, 0, 0)
  //     }
  //     if (options.dyeB) {
  //       const rgb = hexToRgb(options.dyeB)
  //       dye.dyeColorB.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskBDye)
  //     } else {
  //       dye.dyeColorB.set(0, 0, 0, 0)
  //     }
  //     if (options.dyeA) {
  //       const rgb = hexToRgb(options.dyeA)
  //       dye.dyeColorA.set(rgb.r, rgb.g, rgb.b, options.appearance.MaskASpecDye)
  //     } else {
  //       dye.dyeColorA.set(0, 0, 0, 0)
  //     }
  //     dye.updateReflectivity()
  //   })
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
