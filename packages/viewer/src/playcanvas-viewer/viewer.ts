import {
  Application,
  Asset,
  Color,
  Entity,
  FILLMODE_KEEP_ASPECT,
  Keyboard,
  Mouse,
  RESOLUTION_AUTO,
  Texture,
  TouchDevice
} from 'playcanvas'

import { createMaterial } from './create-material'
import { NwExtension } from './nw-extension'

export type File = {
  filename: string
  url: string
}

export class PlayCanvasViewer {
  public readonly app: Application

  private sceneRoot: Entity = null!
  private entities: Array<Entity> = []
  private entityAssets: Array<{ entity: Entity; asset: Asset }> = []
  private assets: Array<Asset> = []

  public constructor(canvas: HTMLCanvasElement) {
    const app = (this.app = new Application(canvas, {
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

    app.setCanvasFillMode(FILLMODE_KEEP_ASPECT);
    app.setCanvasResolution(RESOLUTION_AUTO);

    const camera = new Entity('Camera')

    camera.addComponent('camera', {
      fov: 75,
      frustumCulling: true,
      clearColor: new Color(0, 0, 0, 0),
    })
    camera.setPosition(0, 1, -2)
    camera.lookAt(0, 1, 0)
    app.root.addChild(camera)

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
  }

  public addToScene(asset: Asset) {
    const resource = asset.resource
    const meshesLoaded = resource.renders && resource.renders.length > 0
    const prevEntity: Entity | null = this.entities[this.entities.length - 1] || null

    let entity: Entity

    // create entity
    if (!meshesLoaded && prevEntity && prevEntity.findComponent('render')) {
      entity = prevEntity
    } else {
      entity = asset.resource.instantiateRenderEntity()
      this.entities.push(entity)
      this.entityAssets.push({ entity: entity, asset: asset })
      this.sceneRoot.addChild(entity)
    }

    // store the loaded asset
    this.assets.push(asset)

    return entity
  }

  public loadGltf(gltfUrl: File, externalUrls: Array<File>) {
    return new Promise<Asset>((resolve, reject) => {
      const containerAsset = new Asset(gltfUrl.filename, 'container', gltfUrl, null!, {
        material: {
          process: (gltfMtl: any, textures: Texture[]) => {
            const material = createMaterial(gltfMtl, textures, false)
            NwExtension.attachToMaterial(gltfMtl, material, textures)
            return material
          },
        }
      } as any)
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