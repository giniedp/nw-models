import { Document, Material, Node, Scene, Skin, Transform, mat4, vec3 } from '@gltf-transform/core'
import { KHRLightsPunctual } from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import { createHash } from 'crypto'
import { isChunkCompiledBones, isChunkMesh } from '../../../file-formats/cgf'
import { ModelAnimation } from '../../../types'
import { getNodeExtraField, setNodeExtraField } from '../utils/annotation'
import { mat4IsIdentity } from '../utils/math'
import { convertAnimations } from './convert-animations'
import { convertMesh } from './convert-mesh'
import { convertNodes } from './convert-nodes'
import { convertSkin } from './convert-skin'
import { CgfCameraInput, CgfEntityInput, CgfLightInput, CgfModelInput, CgfResolver, MtlResolver } from './types'

export function appendAnimations({ animations }: { animations: ModelAnimation[] }): Transform {
  return createTransform('append-animations', async (doc: Document): Promise<void> => {
    return convertAnimations({ gltf: doc, animations })
  })
}

export function appendLights({ lights }: { lights: CgfLightInput[] }) {
  return createTransform('append-lights', (doc): Promise<void> => {
    if (!lights?.length) {
      return
    }
    const scene = doc.getRoot().getDefaultScene()
    const extension = doc.createExtension(KHRLightsPunctual)

    const lightsNode = doc.createNode('Lights')
    scene.addChild(lightsNode)
    for (const item of lights) {
      const light = extension.createLight(item.name || 'Light')
      light.setColor(item.color as vec3)
      light.setIntensity(item.intensity)
      if (item.type === 0) {
        light.setType('point')
        light.setRange(item.range)
      }
      if (item.type === 2) {
        light.setType('spot')
        light.setRange(item.range)
        light.setInnerConeAngle(item.innerConeAngle)
        light.setOuterConeAngle(item.outerConeAngle)
      }

      const node = doc.createNode()
      node.setExtension(KHRLightsPunctual.EXTENSION_NAME, light)
      node.setMatrix(item.transform)
      lightsNode.addChild(node)
    }
  })
}

export function appendCameras({ cameras }: { cameras: CgfCameraInput[] }) {
  return createTransform('append-cameras', (doc): Promise<void> => {
    if (!cameras?.length) {
      return
    }
    const scene = doc.getRoot().getDefaultScene()
    const camerasNode = doc.createNode('Cameras')
    scene.addChild(camerasNode)
    for (const camera of cameras) {
      const cam = doc.createCamera(camera.name || 'Camera')
      cam.setZNear(camera.zNear)
      cam.setZFar(camera.zFar)
      cam.setYFov(camera.fov)

      const node = doc.createNode(camera.name || 'Camera')
      node.setMatrix(camera.transform)
      node.setCamera(cam)
      camerasNode.addChild(node)
    }
  })
}

export function appendEntities({ entities }: { entities: CgfEntityInput[] }) {
  return createTransform('append-entities', (doc): Promise<void> => {
    if (!entities?.length) {
      return
    }
    const scene = doc.getRoot().getDefaultScene()
    const entitiesNode = doc.createNode('Entities')
    scene.addChild(entitiesNode)
    for (const item of entities) {
      const node = doc.createNode(item.name)
      node.setMatrix(item.transform)
      if (item.meta) {
        node.setExtras(item.meta)
      }
      entitiesNode.addChild(node)
    }
  })
}

export function appendModels(options: { models: CgfModelInput[]; resolveCgf: CgfResolver; resolveMtl: MtlResolver }) {
  return createTransform('append-models', async (doc: Document): Promise<void> => {
    const scene = doc.getRoot().getDefaultScene()
    const refLookup: Record<string, Node[]> = {}
    for (const input of options.models) {
      const instanceRef = createHash('md5')
        .update(`${input.model}#${input.material}`.toLowerCase().replaceAll('\\', '/'))
        .digest('hex')
      let nodes: Node[]
      if (!refLookup[instanceRef]) {
        nodes = await appendModel({
          doc,
          input,
          resolveCgf: options.resolveCgf,
          resolveMtl: options.resolveMtl,
        })
        refLookup[instanceRef] = nodes
      } else {
        nodes = createInstanceFrom({ doc, nodes: refLookup[instanceRef] })
      }

      addToScene({
        doc,
        scene,
        nodes,
        transform: input.transform,
      })
    }
  })
}

async function appendModel({
  doc,
  input,
  resolveCgf,
  resolveMtl,
}: {
  doc: Document
  input: CgfModelInput
  resolveCgf: CgfResolver
  resolveMtl: MtlResolver
}): Promise<Node[]> {
  const cgf = await resolveCgf(input.model)
  const chunks = cgf.chunks

  let skin: Skin = null
  if (!input.ignoreSkin) {
    skin = convertSkin({
      doc,
      chunk: chunks.find(isChunkCompiledBones),
    })
  }

  if (input.ignoreGeometry) {
    return []
  }

  const gltfMaterials: Material[] = []
  for (const mtl of (await resolveMtl(input.material)) || []) {
    const refId = createHash('sha256').update(JSON.stringify(mtl)).digest('hex')
    let gltfMtl = doc
      .getRoot()
      .listMaterials()
      .find((it) => getNodeExtraField(it, 'refId') === refId)
    if (!gltfMtl) {
      gltfMtl = doc.createMaterial()
      gltfMtl.setName(mtl.Name || `Material ${refId}`)
      setNodeExtraField(gltfMtl, 'refId', refId)
      setNodeExtraField(gltfMtl, 'mtl', mtl)
    }
    gltfMaterials.push(gltfMtl)
  }

  return convertNodes({
    doc: doc,
    chunks,
    handleChunk: (node, chunk) => {
      if (!isChunkMesh(chunk)) {
        return
      }
      const mesh = convertMesh({
        gltf: doc,
        chunk: chunk,
        chunks,
        materials: gltfMaterials,
      })
      if (mesh) {
        node.setMesh(mesh)
      }
      if (mesh && skin) {
        node.setSkin(skin)
      }
    },
  })
}

function createInstanceFrom({ doc, nodes }: { doc: Document; nodes: Node[] }) {
  nodes = flattenNodes(nodes)
  const parents = nodes.map((node) => nodes.indexOf(node.getParentNode()))
  const result: Node[] = []
  for (let i = 0; i < nodes.length; i++) {
    const oldNode = nodes[i]
    const newNode = doc.createNode(oldNode.getName())
    if (oldNode.getMatrix()) {
      newNode.setMatrix(oldNode.getMatrix())
    }
    if (oldNode.getMesh()) {
      newNode.setMesh(oldNode.getMesh())
    }
    if (oldNode.getSkin()) {
      newNode.setSkin(oldNode.getSkin())
    }
    nodes[i] = newNode

    if (parents[i] === -1) {
      result.push(newNode)
    } else {
      nodes[parents[i]].addChild(newNode)
    }
  }
  return result
}

function flattenNodes(nodes: Node[]): Node[] {
  const result = []
  for (const node of nodes) {
    result.push(node)
    result.push(...flattenNodes(node.listChildren()))
  }
  return result
}

function addToScene({ doc, scene, nodes, transform }: { doc: Document; scene: Scene; nodes: Node[]; transform: mat4 }) {
  if (!nodes.length) {
    return
  }
  if (transform && !mat4IsIdentity(transform)) {
    const group = doc.createNode()
    group.setName('Transform')
    group.setMatrix(transform)
    scene.addChild(group)
    for (const node of nodes) {
      group.addChild(node)
    }
  } else {
    for (const node of nodes) {
      scene.addChild(node)
    }
  }
}
