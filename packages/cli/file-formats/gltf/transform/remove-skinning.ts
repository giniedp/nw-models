import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function removeSkinning() {
  return createTransform('removeSkinning', (doc: Document) => {
    for (const node of doc.getRoot().listNodes()) {
      if (node.getSkin()) {
        node.setSkin(null)
      }
    }
  })
}
