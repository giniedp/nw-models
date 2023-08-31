import {
  ASPECT_AUTO,
  Application,
  Asset,
  AssetListLoader,
  CameraComponent,
  CameraComponentSystem,
  Color,
  ContainerHandler,
  Entity,
  FILLMODE_FILL_WINDOW,
  GraphNode,
  Keyboard,
  LAYERID_DEPTH,
  LightComponentSystem,
  Mouse,
  RESOLUTION_AUTO,
  RenderComponentSystem,
  StandardMaterial,
  TextureHandler,
  TouchDevice,
  Vec3,
} from 'playcanvas'
import { writable } from 'svelte/store'

import type { DyeColor } from '../dye-colors'
import { App } from './app'
import { OrbitCamera, OrbitCameraInputKeyboard, OrbitCameraInputMouse, OrbitCameraInputTouch } from './orbit-camera'

export interface PcViewerOptions {
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

export type File = {
  filename: string
  url: string
}

export class PlayCanvasViewer {
  public readonly app: App

  private sceneRoot: Entity = null!
  private entities: Array<Entity> = []
  private entityAssets: Array<{ entity: Entity; asset: Asset }> = []
  private assets: Array<Asset> = []

  public constructor(canvas: HTMLCanvasElement) {
    const app = (this.app = new App(canvas, {
      mouse: new Mouse(canvas),
      touch: new TouchDevice(canvas),
      keyboard: new Keyboard(window),
      graphicsDeviceOptions: {
        preferWebGl2: true,
        alpha: true,
        antialias: true,
        depth: true,
        preserveDrawingBuffer: true,
      },
    }))

    // Depth layer is where the framebuffer is copied to a texture to be used in the following layers.
    // Move the depth layer to take place after World and Skydome layers, to capture both of them.
    const depthLayer = app.scene.layers.getLayerById(LAYERID_DEPTH)!
    app.scene.layers.remove(depthLayer)
    app.scene.layers.insertOpaque(depthLayer, 2)

    // create the orbit camera
    const camera = new Entity('Camera')
    camera.addComponent('camera', {
      fov: 75,
      frustumCulling: true,
      clearColor: new Color(0, 0, 0, 0),
    })
    camera.translate(0, 0, 2)
    camera.camera!.requestSceneColorMap(true)

    const orbitCamera = new OrbitCamera(camera, 0.25)
    const orbitCameraInputMouse = new OrbitCameraInputMouse(app, orbitCamera)
    const orbitCameraInputTouch = new OrbitCameraInputTouch(app, orbitCamera)
    const orbitCameraInputKeyboard = new OrbitCameraInputKeyboard(app, orbitCamera)

    orbitCamera.focalPoint.snapto(new Vec3(0, 0, 0))
    app.root.addChild(camera)

    // create the light
    const light = new Entity()
    light.addComponent('light', {
      type: 'directional',
      shadowBias: 0.2,
      shadowResolution: 2048,
    })
    app.root.addChild(light)

    this.sceneRoot = new Entity('sceneRoot', app)
    app.root.addChild(this.sceneRoot)

    const debugRoot = new Entity('debugRoot', app)
    app.root.addChild(debugRoot)

    
    new ResizeObserver((it) => {
      setTimeout(() => {
        this.app.resizeCanvas()
        this.app.renderNextFrame = true
      })
      
    }).observe(canvas.parentElement!)
  }

  public resetScene() {
    const app = this.app

    this.entities.forEach((entity) => {
      this.sceneRoot.removeChild(entity)
      entity.destroy()
    })
    this.entities = []
    this.entityAssets = []

    this.assets.forEach((asset) => {
      app.assets.remove(asset)
      asset.unload()
    })
    this.assets = []

    // this.meshInstances = []
    // this.resetWireframeMeshes()

  }

  public addToScene(asset: Asset) {
    const resource = asset.resource
    const meshesLoaded = resource.renders && resource.renders.length > 0
    const prevEntity: Entity | null = this.entities.length === 0 ? null : this.entities[this.entities.length - 1]

    let entity: Entity

    // create entity
    if (!meshesLoaded && prevEntity && prevEntity.findComponent('render')) {
      entity = prevEntity
    } else {
      entity = asset.resource.instantiateRenderEntity()
      this.entities.push(entity)
      this.entityAssets.push({ entity: entity, asset: asset })
      this.sceneRoot.addChild(entity)
      //this.shadowCatcher.onEntityAdded(entity)
    }

    // store the loaded asset
    this.assets.push(asset)
  }

  public loadGltf(gltfUrl: File, externalUrls: Array<File>) {
    return new Promise<Asset>((resolve, reject) => {
      const containerAsset = new Asset(gltfUrl.filename, 'container', gltfUrl, null!)
      containerAsset.on('load', () => resolve(containerAsset))
      containerAsset.on('error', (err: string) => reject(err))
      this.app.assets.add(containerAsset)
      this.app.assets.load(containerAsset)
    })
  }

  public dispose() {
    this.app.destroy()
  }
}

export type PcViewer = ReturnType<typeof showPcViewer>
export function showPcViewer(options: PcViewerOptions) {
  const appearance = writable<AppearanceDyeExtras | null>(null)
  const dyeR = writable<DyeColor | null>(null)
  const dyeG = writable<DyeColor | null>(null)
  const dyeB = writable<DyeColor | null>(null)
  const dyeA = writable<DyeColor | null>(null)
  const debugMask = writable<boolean | null>(null)

  const modelUrl = new URL(options.modelUrl, location.origin).toString()

  const canvas = document.createElement('canvas')
  canvas.style.width = '100%'
  options.el.appendChild(canvas)
  const viewer = new PlayCanvasViewer(canvas)
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
    })
  viewer.app.start()
  viewer.app.on('update', function (dt) {
    // if (entity) {
    //   entity.rotate(0, 100 * dt, 0)
    // }
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
      //   unsub?.()
    },
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
