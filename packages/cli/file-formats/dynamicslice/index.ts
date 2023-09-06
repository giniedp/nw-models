import path from 'path'
import { ModelMeshAsset } from 'types'
import { findInJson } from '../../tools/walk-json'
import { getModelsFromCdf } from '../cdf'
import {
  SliceComponent,
  isGameTransformComponent,
  isMeshComponent,
  isMeshComponentRenderNode,
  isSkinnedMeshComponent,
  isSkinnedMeshComponentRenderNode,
  isSliceComponent,
} from './types'
import { logger } from '../../utils/logger'

export async function getHousingItemMeshes(obj: any) {
  const result: ModelMeshAsset[] = []

  const entities = findInJson<SliceComponent>(obj, isSliceComponent)?.entities || []
  for (const entity of entities) {
    let model: string = null
    let material: string = null
    let transform: number[] = []

    for (const component of entity.components || []) {
      if (isGameTransformComponent(component)) {
        const world = component.m_worldtm.__value
        const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = world['rotation/scale']
        const [x, y, z] = world.translation
        // prettier-ignore
        transform = [
          r0, r1, r2, 0,
          r3, r4, r5, 0,
          r6, r7, r8, 0,
          x, y, z, 1
        ]
        continue
      }
      if (isMeshComponent(component)) {
        const meshNode = component['static mesh render node']
        if (isMeshComponentRenderNode(meshNode) && meshNode.visible) {
          model = meshNode['static mesh']?.hint
          material = meshNode['material override asset']?.hint
        }
        continue
      }
      if (isSkinnedMeshComponent(component)) {
        const meshNode = component['skinned mesh render node']
        if (isSkinnedMeshComponentRenderNode(meshNode) && meshNode.visible) {
          model = meshNode['skinned mesh']?.hint
          material = meshNode['material override asset']?.hint
        }
        continue
      }
    }

    if (model) {
      result.push({
        model,
        material,
        transform,
      })
    }
  }
  return result
}
