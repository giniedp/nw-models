import { Material, Property, mat4 } from '@gltf-transform/core'
import { MtlObject } from '../../../file-formats/mtl/types'

export type NodeExtraKey = 'controllerId' | 'inverse' | 'mtl' | 'refId'

export function getMtlObject(material: Material) {
  return material ? getNodeExtraField<MtlObject>(material, 'mtl') : null
}

export function setNodeExtraField(node: Property, key: NodeExtraKey, value: any) {
  const extras = node.getExtras() || {}
  if (value == null) {
    delete extras[key]
  } else {
    extras[key] = value
  }
  node.setExtras(extras)
}

export function getNodeExtraField<T = unknown>(node: Property, key: NodeExtraKey): T {
  return node.getExtras()?.[key] as any
}
