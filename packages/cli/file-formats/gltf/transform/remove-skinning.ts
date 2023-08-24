import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function removeSkinning() {
  return createTransform('removeSkinning', (doc: Document) => {
    for (const node of doc.getRoot().listNodes()) {
      if (node.getSkin()) {
        node.setSkin(null)
      }
    }

    for (const mesh of doc.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives() || []) {
        primitive.getAttribute('JOINTS_0')?.setBuffer?.(null)
        primitive.getAttribute('WEIGHTS_0')?.setBuffer?.(null)
        primitive.setAttribute('JOINTS_0', null)
        primitive.setAttribute('WEIGHTS_0', null)
      }
    }
  })
}
