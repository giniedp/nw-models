import {
  Asset,
  Color,
  Entity,
  FILLMODE_FILL_WINDOW,
  FILLMODE_KEEP_ASPECT,
  Keyboard,
  LAYERID_DEPTH,
  Mouse,
  RESOLUTION_AUTO,
  TouchDevice,
  Vec3
} from 'playcanvas'

import { App } from './app'
import { OrbitCamera, OrbitCameraInputKeyboard, OrbitCameraInputMouse, OrbitCameraInputTouch } from './orbit-camera'

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

    app.setCanvasFillMode(FILLMODE_KEEP_ASPECT);
    app.setCanvasResolution(RESOLUTION_AUTO);

    // create the orbit camera
    const camera = new Entity('Camera')
    camera.addComponent('camera', {
      fov: 75,
      frustumCulling: true,
      clearColor: new Color(0, 0, 0, 0),
    })
    camera.setPosition(0, 1, -2)
    camera.lookAt(0, 1, 0)
    //camera.camera!.requestSceneColorMap(true)

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
    light.setPosition(0, 1, 1)
    light.lookAt(0, 0, 0)
    app.root.addChild(light)

    this.sceneRoot = new Entity('sceneRoot', app)
    app.root.addChild(this.sceneRoot)

    const debugRoot = new Entity('debugRoot', app)
    app.root.addChild(debugRoot)
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