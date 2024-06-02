import { mat4 } from '@gltf-transform/core'
import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import { AssetNode, CameraAssetNode, LightAssetNode, MeshAssetNode } from '../../types'
import { cryToGltfMat4, mat4Identity } from '../gltf/utils/math'
import { ClassNode, ObjectStreamDocument } from './types'

export async function readEntitiesXml(file: string): Promise<ObjectStreamDocument> {
  const data = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return parseEntitiesXml(data)
}

export function parseEntitiesXml(data: string): ObjectStreamDocument {
  const parser = new XMLParser({
    preserveOrder: false,
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (nodeName) => {
      if (nodeName === 'Class') {
        return true
      }
      return false
    },
  })
  return parser.parse(data)
}

export type OnMeshCallback = (node: MeshAssetNode) => void
export type OnLightCallback = (node: LightAssetNode) => void
export type OnCameraCallback = (node: CameraAssetNode) => void
export type OnEntityCallback = (node: AssetNode) => void
export interface AssetHandler {
  onModel: OnMeshCallback
  onLight: OnLightCallback
  onCamera: OnCameraCallback
  onEntity: OnEntityCallback
}

export function scanObjectStreamDocument(input: ObjectStreamDocument, handler: AssetHandler) {
  for (const node of input.ObjectStream.Class) {
    scanEntity(node, handler)
  }
}

function scanEntity(node: ClassNode, handler: AssetHandler) {
  harvestEntities(node, handler)
  harvestComponents(node, handler)
}

function harvestEntities(entityNode: ClassNode, handler: AssetHandler) {
  const entities = getField(entityNode, 'Entities')
  if (!entities) {
    return
  }
  for (const entity of entities.Class) {
    scanEntity(entity, handler)
  }
}

function harvestComponents(entityNode: ClassNode, handler: AssetHandler) {
  const components = getField(entityNode, 'Components')
  if (!components) {
    return
  }
  const entityName = getField(entityNode, 'Name')?.value
  let transform: mat4
  let model: string
  let modelId: string
  let material: string
  let light: LightAssetNode
  let camera: CameraAssetNode
  for (const component of components.Class) {
    if (component.name === 'SliceComponent') {
      scanEntity(component, handler)
    }
    if (component.name === 'TransformComponent') {
      transform = getTransformMatrix(getField(component, 'Transform'))
    }
    if (component.name === 'GameTransformComponent') {
      transform = getTransformMatrix(getField(component, 'm_worldTM'))
    }
    if (component.name === 'SkinnedMeshComponent') {
      const renderNode = getField(component, 'Skinned Mesh Render Node')
      const isVisible = !!getField(renderNode, 'Visible')
      if (!isVisible) {
        continue
      }

      const meshNode = getField(renderNode, 'Skinned Mesh')
      const meshAsset = String(meshNode.value || '')
        .split(',')
        .map((it) => {
          const [key, value] = it.split('=')
          return { key, value }
        })
        .reduce((acc, it) => {
          acc[it.key] = it.value.match(/{(.*)}/)[1]
          return acc
        }, {} as Record<string, string>)

      const mtlOverride = getField(renderNode, 'Material Override', 'BaseClass1', 'AssetPath')?.value
      model = model || meshAsset['hint']
      modelId = modelId || meshAsset['id']
      material = material || mtlOverride
    }

    if (component.name === 'MeshComponent') {
      const renderNode = getField(component, 'Static Mesh Render Node')
      const isVisible = !!getField(renderNode, 'Visible')
      if (!isVisible) {
        continue
      }

      const meshNode = getField(renderNode, 'Static Mesh')
      const meshAsset = String(meshNode.value || '')
        .split(',')
        .map((it) => {
          const [key, value] = it.split('=')
          return { key, value }
        })
        .reduce((acc, it) => {
          acc[it.key] = it.value.match(/{(.*)}/)[1]
          return acc
        }, {} as Record<string, string>)

      const mtlOverride = getField(renderNode, 'Material Override', 'BaseClass1', 'AssetPath')?.value
      model = model || meshAsset['hint']
      modelId = modelId || meshAsset['id']
      material = material || mtlOverride
    }
    if (component.name === 'LightComponent') {
      const config = getField(component, 'LightConfiguration')
      const isVisible = !!getField(config, 'Visible')?.value
      if (!isVisible) {
        continue
      }
      const type = getField(config, 'LightType')?.value
      const isPoint = type === 0
      const isSpot = type === 2
      if (!isPoint && !isSpot) {
        continue
      }

      light = {
        type: type,
        color: [1, 1, 1],
        intensity: 1,
        range: 0,
        innerConeAngle: 0,
        outerConeAngle: 0,
        transform: mat4Identity(),
      }
      light.color = getField(config, 'Color')?.value.split(' ').map(Number)
      light.intensity = getField(config, 'DiffuseMultiplier')?.value
      light.name = getField(config, 'Name')?.value
      if (isPoint) {
        light.range = getField(config, 'PointMaxDistance')?.value
      }
      if (isSpot) {
        light.range = getField(config, 'ProjectorDistance')?.value
        light.innerConeAngle = 0
        light.outerConeAngle = (getField(config, 'ProjectorFOV')?.value * Math.PI) / 180
      }
    }
    if (component.name === 'CameraComponent') {
      camera = {
        transform: mat4Identity(),
        zNear: getField(component, 'Near Clip Plane Distance')?.value,
        zFar: getField(component, 'Far Clip Plane Distance')?.value,
        fov: (getField(component, 'Field of View')?.value * Math.PI) / 180,
      }
    }
  }
  if (model) {
    handler.onModel?.({
      transform,
      model,
      material,
    })
  }
  if (light) {
    handler.onLight?.({
      ...light,
      name: entityName,
      transform: transform,
    })
  }
  if (camera) {
    handler.onCamera?.({
      ...camera,
      name: entityName,
      transform: transform,
    })
  }
  if (transform) {
    handler.onEntity?.({
      name: entityName,
      transform,
    })
  }
}

function getField(node: ClassNode, name: string, ...keys: string[]) {
  if (!node?.Class) {
    return null
  }
  let result = node.Class.find((it) => it.field === name)
  for (const key of keys) {
    result = result?.Class.find((it) => it.field === key)
  }
  return result
}

export function getTransformMatrix(component: ClassNode): mat4 {
  if (!component.value || typeof component.value !== 'string') {
    return mat4Identity()
  }
  const [x1, y1, z1, x2, y2, z2, x3, y3, z3, x, y, z] = component.value.split(' ').map(Number)
  return cryToGltfMat4(
    // prettier-ignore
    [
      x1, y1, z1, 0,
      x2, y2, z2, 0,
      x3, y3, z3, 0,
       x,  y,  z, 1
    ],
  )
}

export function debugObjectStream(input: ObjectStreamDocument) {
  const node = input.ObjectStream.Class[0]
  const components = getField(node, 'Components')
  const sliceComponent = getElementByName(components, 'SliceComponent')
  const entities = getField(sliceComponent, 'Entities')
  const list = entities.Class.map((entity) => {
    const transform = getElementByName(getField(entity, 'Components'), 'TransformComponent')
    return {
      entity,
      name: getField(entity, 'Name')?.value,
      id: getField(getField(entity, 'Id'), 'id')?.value,
      parentId: getField(getField(transform, 'Parent'), 'id')?.value,
    }
  })
  const roots = list.filter((it) => !it.parentId || !list.find((child) => child.id === it.parentId))
  function selectChildren(it: (typeof list)[0]): any {
    return {
      ...it,
      children: list.filter((child) => child.parentId === it.id).map(selectChildren),
    }
  }

  function logTree(it: (typeof list)[0], indent = 0) {
    console.log('  '.repeat(indent), '+', it.name)
    const components = getField(it.entity, 'Components')
    if (components) {
      for (const component of components.Class) {
        const cType = component.name
        const cName = getField(component, 'Name')?.value
        console.log('  '.repeat(indent + 1), '#', cType, cName || '')
      }
    }
    for (const child of list.filter((child) => child.parentId === it.id)) {
      logTree(child, indent + 1)
    }
  }
  for (const root of roots) {
    logTree(root)
  }
  // for (const node of input.ObjectStream.Class) {
  //   dumpComponents(node)
  // }
}

function dumpComponents(input: ClassNode, indent = 0) {
  const type = input.name
  const name = getField(input, 'Name')?.value
  console.log('  '.repeat(indent), type, name)
  const entities = getField(input, 'Entities')
  if (entities) {
    console.log('  '.repeat(indent), '-- Entities --')
    for (const entity of entities.Class) {
      dumpComponents(entity, indent + 1)
    }
  }
  const components = getField(input, 'Components')
  if (components) {
    console.log('  '.repeat(indent), '-- Components --')
    for (const component of components.Class) {
      const cType = component.name
      const cName = getField(component, 'Name')?.value
      console.log('  '.repeat(indent), cType, cName)
      if (component.name === 'SliceComponent') {
        dumpComponents(component, indent + 1)
      }
    }
  }
}

function getElementByName(components: ClassNode, name: string) {
  for (const component of components.Class) {
    if (component.name === name) {
      return component
    }
  }
}
