import { Document, Node, mat4 } from '@gltf-transform/core'
import { ChunkCompiledBones } from '../../cgf/chunks'
import { setNodeExtraField } from '../utils/annotation'
import { cryToGltfMat4, mat4Multiply, mat4Transpose } from '../utils/math'

export function convertSkin({ doc, chunk }: { doc: Document; chunk: ChunkCompiledBones }) {
  if (!chunk || !chunk.bones?.length) {
    return null
  }

  const gltfBones: Node[] = []
  const transforms: Array<mat4> = []
  const inverse: Array<mat4> = []
  for (let i = 0; i < chunk.bones.length; i++) {
    const bone = chunk.bones[i]
    gltfBones[i] = doc.createNode()
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
    transforms[i] = cryToGltfMat4(transforms[i])
    inverse[i] = cryToGltfMat4(inverse[i])
  }

  for (let i = 0; i < chunk.bones.length; i++) {
    const bone = chunk.bones[i]
    const gltfBone = gltfBones[i]
    let transform = transforms[i]

    if (bone.m_nOffsetParent === 0) {
      doc.getRoot().getDefaultScene().addChild(gltfBone)
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

  const skin = doc.createSkin()
  for (let i = 0; i < gltfBones.length; i++) {
    skin.addJoint(gltfBones[i])
  }
  const accessor = doc.createAccessor()
  accessor.setType('MAT4')
  accessor.setArray(new Float32Array(inverse.flat()))
  skin.setInverseBindMatrices(accessor)

  return skin
}
