import { Node, mat4, Property } from '@gltf-transform/core'

export type NodeExtraKey = 'controllerId'

export function setNodeExtraField(node: Property, key: NodeExtraKey, value: any) {
  const extras = node.getExtras() || {}
  extras[key] = value
  node.setExtras(extras)
}

export function getNodeExtraField<T = unknown>(node: Property, key: NodeExtraKey): T {
  return node.getExtras()?.[key] as any
}

export function vectorToGltfSpace([x, y, z]: [number, number, number]) {
  return [-x, z, y]
}

export function quaternionToGltfSpace([x, y, z, w]: [number, number, number, number]) {
  return [-x, z, y, w]
}


export function vectorsToGltfSpace(list: Array<[number, number, number]>) {
  return list.map(vectorToGltfSpace)
}

export function typedVectorsToGltfSpace(list: Float32Array): void {
  for (let i = 0; i < list.length; i += 3) {
    const x = list[i]
    const y = list[i + 1]
    const z = list[i + 2]
    list[i] = -x
    list[i + 1] = z
    list[i + 2] = y
  }
}

export function rotationsToGltfSpace(list: Array<[number, number, number, number]>) {
  return list.map(quaternionToGltfSpace)
}

export function typedRotationsToGltfSpace(list: Float32Array): void {
  for (let i = 0; i < list.length; i += 4) {
    const x = list[i]
    const y = list[i + 1]
    const z = list[i + 2]
    const w = list[i + 3]
    list[i] = -x
    list[i + 1] = z
    list[i + 2] = y
    list[i + 3] = w
  }
}

    // M':   swapped matrix
    // T:    swap matrix = new Matrix4x4(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1)
    // T^-1: inverse of swap matrix (= T, for this specific configuration)
    // M' = T @ M @ T^-1 = <what's below>
export function mat4toGltfSpace(mat: mat4): mat4 {
  return [
    mat[0],  -mat[2],  -mat[1], -mat[3],
    -mat[8],  mat[10], mat[9],  mat[11],
    -mat[4],  mat[6],  mat[5],  mat[7],
    -mat[12], mat[14], mat[13], mat[15]
  ]
}

export const TO_GLTF_MAT: mat4 = [
  -1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]
