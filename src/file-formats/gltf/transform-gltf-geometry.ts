import { NullEngine, Scene, SceneLoader, VertexBuffer, VertexData } from 'babylonjs'
import { IGLTF } from 'babylonjs-gltf2interface'
import { GLTFFileLoader, GLTFLoaderCoordinateSystemMode } from 'babylonjs-loaders'
import { GLTF2Export } from 'babylonjs-serializers'

import { logger, readJsonFile, writeFile } from '../../utils'

export async function transformGltfGeometry({ input, output }: { input: string; output: string }) {
  const inputModel = await readJsonFile<IGLTF>(input)

  removeSkinning(inputModel)
  removeVertexColor(inputModel)

  const context = await loadScene(inputModel)

  // some meshes have normal buffers with all vertices bein zero
  computeNormals(context.scene)

  // export and save the scene
  await GLTF2Export.GLTFAsync(context.scene, 'result', {
    exportUnusedUVs: true,
  })
    .then(async ({ glTFFiles }) => {
      // result is a gltf model as json string, parse it
      const outputModel = JSON.parse(glTFFiles['result.gltf'] as string) as IGLTF

      // babylon writes array buffers to external file
      // grab the buffers and embed as base64
      for (const buffer of outputModel.buffers) {
        if (!(buffer.uri in glTFFiles)) {
          continue
        }
        const blob = glTFFiles[buffer.uri] as Blob
        const data = await blob.arrayBuffer()
        const base64 = Buffer.from(data).toString('base64')
        buffer.uri = `data:application/octet-stream;base64,${base64}`
      }

      // TODO: research this
      // babylon does not export materials and images
      // just take from input
      outputModel.materials = clone(inputModel.materials)
      outputModel.samplers = inputModel.samplers
      outputModel.images = inputModel.images
      outputModel.textures = inputModel.textures

      // serialize
      return JSON.stringify(outputModel, null, 2)
    })
    .then((result) => {
      // and write
      return writeFile(output, result, {
        createDir: true,
        encoding: 'utf-8',
      })
    })
  context.scene.dispose()
  context.engine.dispose()
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function removeSkinning(gltf: IGLTF) {
  // we do not need skinning at the moment.
  // models are broken with skinning enabled
  // TODO: review cgf-converter
  if (gltf.nodes) {
    for (const node of gltf.nodes) {
      if (node.skin != null) {
        delete node.skin
      }
    }
  }
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives || []) {
      const attributes = primitive.attributes
      if (attributes?.JOINTS_0) {
        delete attributes.JOINTS_0
      }
      if (attributes?.WEIGHTS_0) {
        delete attributes.WEIGHTS_0
      }
    }
  }
  if (gltf.skins) {
    delete gltf.skins
  }
}

function removeVertexColor(gltf: IGLTF) {
  // If vertex colors are present, the default shader uses them instead of the diffuse texture
  // We remove them for now.
  // TODO: find out what vertex colors are used for (tint?) and configure the shader that way
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives || []) {
      const attributes = primitive.attributes
      if (attributes?.COLOR_0) {
        delete attributes.COLOR_0
      }
      if (attributes?.COLOR_1) {
        delete attributes.COLOR_1
      }
    }
  }
}

async function loadScene(model: IGLTF) {
  // need a copy, the loader will mutate the object
  model = clone(model)

  if (!logger.isVerbose) {
    BABYLON.Logger.LogLevels = BABYLON.Logger.NoneLogLevel
  }
  // create engine
  const engine = new NullEngine()
  const scene = new Scene(engine)
  
  SceneLoader.RegisterPlugin(new GLTFFileLoader())
  // load the model into scene
  const loader = new GLTFFileLoader()
  loader.loadAllMaterials = true
  loader.createInstances = true
  loader.coordinateSystemMode = GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED

  // loader.loggingEnabled = true
  await loader.loadAsync(scene, { json: model }, '')
  return {
    engine,
    scene,
    model,
  }
}

function computeNormals(scene: Scene) {
  for (const mesh of scene.meshes) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)
    const indices = mesh.getIndices()
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind)
    if (!positions) {
      continue
    }

    // swap index buffer order, to invert normals
    // otherwise normals are faced inwards
    const iSwapped = new Array(indices.length)
    for (let i = 0; i < indices.length; i += 3) {
      iSwapped[i] = indices[i]
      iSwapped[i + 1] = indices[i + 2]
      iSwapped[i + 2] = indices[i + 1]
    }
    VertexData.ComputeNormals(positions, iSwapped, normals)
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals, false, false)
  }
}
