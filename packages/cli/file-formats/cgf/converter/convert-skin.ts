import { Document, MathUtils, Node, mat4 } from '@gltf-transform/core'
import { ChunkCompiledBones } from '../chunks'
import { TO_GLTF_MAT, mat4toGltfSpace, setNodeExtraField } from './utils';


export function convertSkin({ gltf, chunk }: { gltf: Document; chunk: ChunkCompiledBones }) {
  if (!chunk || !chunk.bones?.length) {
    return null
  }

  const gltfBones: Node[] = []
  const transforms: Array<mat4> = []
  const inverse: Array<mat4> = []
  for (let i = 0; i < chunk.bones.length; i++) {
    const bone = chunk.bones[i]
    gltfBones[i] = gltf.createNode()
    gltfBones[i].setName(bone.boneName)
    setNodeExtraField(gltfBones[i], 'controllerId', bone.controllerId)
    transforms[i] = mat4Transpose([
      bone.boneToWorld[0],
      bone.boneToWorld[1],
      bone.boneToWorld[2],
      bone.boneToWorld[3],
      bone.boneToWorld[4],
      bone.boneToWorld[5],
      bone.boneToWorld[6],
      bone.boneToWorld[7],
      bone.boneToWorld[8],
      bone.boneToWorld[9],
      bone.boneToWorld[10],
      bone.boneToWorld[11],
      0,
      0,
      0,
      1,
    ])
    inverse[i] = mat4Transpose([
      bone.worldToBone[0],
      bone.worldToBone[1],
      bone.worldToBone[2],
      bone.worldToBone[3],
      bone.worldToBone[4],
      bone.worldToBone[5],
      bone.worldToBone[6],
      bone.worldToBone[7],
      bone.worldToBone[8],
      bone.worldToBone[9],
      bone.worldToBone[10],
      bone.worldToBone[11],
      0,
      0,
      0,
      1,
    ])
    transforms[i] = mat4toGltfSpace(transforms[i])
    inverse[i] = mat4toGltfSpace(inverse[i])
  }

  for (let i = 0; i < chunk.bones.length; i++) {
    const bone = chunk.bones[i]
    const gltfBone = gltfBones[i]
    let transform = transforms[i]

    if (bone.m_nOffsetParent === 0) {
      gltf.getRoot().getDefaultScene().addChild(gltfBone)
    } else {
      const parentIndex = i + bone.m_nOffsetParent
      const gltfParent = gltfBones[parentIndex]
      if (!gltfParent) {
        throw new Error(`Parent bone not found: ${parentIndex}`)
      }
      gltfParent.addChild(gltfBone)
      transform = mat4Multiply(inverse[parentIndex], transform)
    }
    gltfBone.setMatrix(transform)
  }

  const skin = gltf.createSkin()
  for (let i = 0; i < gltfBones.length; i++) {
    skin.addJoint(gltfBones[i])
  }
  const accessor = gltf.createAccessor()
  accessor.setType('MAT4')
  accessor.setArray(new Float32Array(inverse.flat()))
  skin.setInverseBindMatrices(accessor)

  return skin
}

function mat4Transpose(m: mat4): mat4 {
  return [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]]
}

function mat4Multiply(a: mat4, b: mat4, out?: mat4) {
  const c = out || ([] as any as mat4)

  const a00 = a[0]
  const a01 = a[1]
  const a02 = a[2]
  const a03 = a[3]
  const a10 = a[4]
  const a11 = a[5]
  const a12 = a[6]
  const a13 = a[7]
  const a20 = a[8]
  const a21 = a[9]
  const a22 = a[10]
  const a23 = a[11]
  const a30 = a[12]
  const a31 = a[13]
  const a32 = a[14]
  const a33 = a[15]

  const b00 = b[0]
  const b01 = b[1]
  const b02 = b[2]
  const b03 = b[3]
  const b10 = b[4]
  const b11 = b[5]
  const b12 = b[6]
  const b13 = b[7]
  const b20 = b[8]
  const b21 = b[9]
  const b22 = b[10]
  const b23 = b[11]
  const b30 = b[12]
  const b31 = b[13]
  const b32 = b[14]
  const b33 = b[15]

  c[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30
  c[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31
  c[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32
  c[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33
  c[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30
  c[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31
  c[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32
  c[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33
  c[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30
  c[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31
  c[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32
  c[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33
  c[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30
  c[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31
  c[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32
  c[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
  return c
}
