import { Document, Node, Skin, mat4 } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'
import { getNodeExtraField, setNodeExtraField } from '../utils/annotation'

export function mergeSkins() {
  return createTransform('mergeSkins', (doc: Document) => {
    const oldSkins = doc.getRoot().listSkins()
    if (oldSkins.length <= 1) {
      return
    }

    const logger = doc.getLogger()
    const newSkin = doc.createSkin()
    for (const oldSkin of oldSkins) {
      for (const joint of oldSkin.listJoints()) {
        const node = getJointCopy(joint, {
          oldSkin,
          newSkin,
          doc,
        })
        if (joint.getParentNode()) {
          const parent = getJointCopy(joint.getParentNode(), {
            oldSkin,
            newSkin,
            doc,
          })
          parent.addChild(node)
        }
      }
    }

    const newJoints = newSkin.listJoints()
    for (const joint of newJoints) {
      if (!joint.getParentNode()) {
        doc.getRoot().getDefaultScene().addChild(joint)
      }
    }

    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh()
      const oldSkin = node.getSkin()
      if (!mesh || !oldSkin) {
        continue
      }
      const oldJoints = oldSkin.listJoints()
      for (const prim of mesh.listPrimitives()) {
        const attr = prim.getAttribute('JOINTS_0')
        const data = attr.getArray() as Uint8Array
        for (let i = 0; i < data.length; i++) {
          const oldIndex = data[i]
          const controllerId = getNodeExtraField(oldJoints[oldIndex], 'controllerId')
          const newIndex = newJoints.findIndex((it) => getNodeExtraField(it, 'controllerId') === controllerId)
          if (oldIndex !== newIndex) {
            data[i] = newIndex
          }
        }
        attr.setArray(data)
      }
      node.setSkin(newSkin)
    }

    const accessor = doc.createAccessor()
    accessor.setType('MAT4')
    accessor.setArray(new Float32Array(newJoints.map((it) => getNodeExtraField(it, 'inverse') as mat4).flat()))
    newSkin.setInverseBindMatrices(accessor)

    newJoints.forEach((it) => {
      setNodeExtraField(it, 'inverse', undefined)
    })

    for (const oldSkin of oldSkins) {
      for (const joint of oldSkin.listJoints()) {
        setNodeExtraField(joint, 'controllerId', undefined)
      }
      logger.debug(`Skin merged: ${oldSkin.listJoints().length} joints`)
      oldSkin.detach()
    }
    logger.debug(`New skin: ${newSkin.listJoints().length} joints`)
  })
}

function getJointCopy(
  oldJoint: Node,
  {
    oldSkin,
    newSkin,
    doc,
  }: {
    oldSkin: Skin
    newSkin: Skin
    doc: Document
  },
) {
  const controllerId = getNodeExtraField(oldJoint, 'controllerId') as any
  const found = newSkin.listJoints().find((it) => getNodeExtraField(it, 'controllerId') === controllerId)
  if (found) {
    return found
  }
  const result = doc.createNode()
  result.setName(oldJoint.getName())
  result.setMatrix(oldJoint.getMatrix())
  setNodeExtraField(result, 'controllerId', controllerId)
  //setNodeExtraField(result, 'inverse', getNodeExtraField(oldJoint, 'inverse'))
  const index = oldSkin.listJoints().indexOf(oldJoint)
  const matrices = oldSkin.getInverseBindMatrices().getArray() as Float32Array
  const inverse = Array.from(matrices.slice(index * 16, (index + 1) * 16))
  setNodeExtraField(result, 'inverse', inverse)
  newSkin.addJoint(result)
  return result
}
