import { derived, type Unsubscriber, type Writable } from 'svelte/store'

import type { DyeColor } from '../dye-colors'
import { PlayCanvasViewer } from './viewer'
import { StandardMaterial, type Asset, Entity } from 'playcanvas'
import { NwExtension, type AppearanceMetadata } from './nw-extension'


export interface PcViewerOptions {
  el: HTMLElement
  modelUrl: string

  dyeR: Writable<DyeColor | null>
  dyeG: Writable<DyeColor | null>
  dyeB: Writable<DyeColor | null>
  dyeA: Writable<DyeColor | null>
  debugMask: Writable<boolean | null>
  appearance: Writable<AppearanceMetadata | null>
}
export interface DyeChannel {
  color: string
  enabled: boolean
}

export type Viewer = ReturnType<typeof initViewer>
export function initViewer({ el, modelUrl, dyeR, dyeG, dyeB, dyeA, debugMask, appearance }: PcViewerOptions) {

  const toUnsub: Unsubscriber[] = []
  const canvas = document.createElement('canvas')
  canvas.style.maxWidth = "100%"
  el.appendChild(canvas)

  const viewer = new PlayCanvasViewer(canvas)
  let entity: Entity | null = null
  viewer.app.start()
  viewer.app.on('update', function (dt) {
    if (entity) {
      entity.rotate(0, dt * 10, 0)
    }
  })
  showModel(modelUrl)

  function showModel(modelUrl: string) {
    viewer.resetScene()
    toUnsub.forEach((it) => it())

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
        entity = viewer.addToScene(asset)
        toUnsub.push(bindMaterials(asset))
      }).catch(console.error)
  }

  function bindMaterials(asset: Asset) {
    console.log(asset.resource.materials)
    const materials: StandardMaterial[] = asset.resource.materials.map((it: any) => {
      return it.resource
    }).filter((it: any) => {
      return !!NwExtension.getMaskTexture(it)
    })
    console.log(materials)
    if (!materials.length) {
      return () => null
    }

    const foundAppearance = materials.map((it) => NwExtension.getAppearance(it)).find((it) => !!it)
    appearance.set(foundAppearance!)

    return derived([appearance, dyeR, dyeG, dyeB, dyeA, debugMask], (it) => it).subscribe(([data, r, g, b, a, debug]) => {
      materials.forEach((mtl) => {
        NwExtension.updateMaterial(mtl, {
          appearance: data!,
          dyeR: r?.Color,
          dyeG: g?.Color,
          dyeB: b?.Color,
          dyeA: a?.Color,
          debugMask: !!debug,
        })
      })
    })
  }

  return {
    dispose: () => {
      viewer.dispose()
      toUnsub.forEach((it) => it())
    },
    showModel
  }
}
