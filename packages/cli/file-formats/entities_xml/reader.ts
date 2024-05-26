import { mat4 } from '@gltf-transform/core'
import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
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

export type AssetHandler = (node: { transform?: number[]; model?: string; modelId?: string; material?: string }) => void

export function getModelsFromObjectStream(input: ObjectStreamDocument, handler: AssetHandler) {
  for (const node of input.ObjectStream.Class) {
    getModelsFromEntity(node, handler)
  }
}

function getModelsFromEntity(node: ClassNode, handler: AssetHandler) {
  const entities = getField(node, 'Entities')
  if (entities) {
    for (const entity of entities.Class) {
      getModelsFromEntity(entity, handler)
    }
  }
  const components = getField(node, 'Components')
  if (components) {
    getModelsFromComponents(components, handler)
  }
}

function getModelsFromComponents(node: ClassNode, handler: AssetHandler) {
  let transform: number[]
  let model: string
  let modelId: string
  let material: string
  for (const component of node.Class) {
    if (component.name === 'SliceComponent') {
      getModelsFromEntity(component, handler)
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
  }
  if (model) {
    handler({
      transform,
      model,
      modelId,
      material,
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
