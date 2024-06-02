import { mat4 } from '@gltf-transform/core'
import { MeshAssetNode } from '../../types'
import {
  AZ__Entity,
  isAZ__Entity,
  isGameTransformComponent,
  isMeshComponent,
  isMeshComponentRenderNode,
  isSkinnedMeshComponent,
  isSkinnedMeshComponentRenderNode,
  isSliceComponent,
} from './types'
import { getAssetPath, getTransformMatrix } from './utils'

export async function getModelsFromSlice({ slice, catalog }: { slice: Object; catalog: Record<string, string> }) {
  const result: MeshAssetNode[] = []

  if (!isAZ__Entity(slice)) {
    return result
  }

  const entities = slice.components?.find(isSliceComponent)?.entities || []
  for (const entity of entities) {
    const model = await getModelFromSliceEntity(entity, catalog)
    if (model) {
      result.push(model)
    }
  }
  return result
}

export async function getModelFromSliceEntity(
  entity: AZ__Entity,
  catalog: Record<string, string>,
): Promise<MeshAssetNode> {
  let model: string = null
  let material: string = null
  let transform: mat4 = null
  let isStatic: boolean

  for (const component of entity.components || []) {
    // logger.debug(component.__type)
    if (isGameTransformComponent(component)) {
      transform = getTransformMatrix(component)
      // logger.debug(component.m_parentid, transform)
      continue
    }
    if (isMeshComponent(component)) {
      const meshNode = component['static mesh render node']
      if (isMeshComponentRenderNode(meshNode) && meshNode.visible) {
        model = getAssetPath(catalog, meshNode['static mesh'])
        material = getAssetPath(catalog, meshNode['material override asset'])
        isStatic = true
      }
      continue
    }
    if (isSkinnedMeshComponent(component)) {
      const meshNode = component['skinned mesh render node']
      if (isSkinnedMeshComponentRenderNode(meshNode) && meshNode.visible) {
        model = getAssetPath(catalog, meshNode['skinned mesh'])
        material = getAssetPath(catalog, meshNode['material override asset'])
      }
      continue
    }
  }

  if (!model) {
    return null
  }
  return {
    model,
    material,
    transform,
    ignoreGeometry: false,
    ignoreSkin: false,
  }
}
