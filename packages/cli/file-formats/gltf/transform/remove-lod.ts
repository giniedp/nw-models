import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function removeLod() {
  return createTransform('remove-lod', (doc: Document) => {
    const logger = doc.getLogger()
    let count = 0
    for (const node of doc.getRoot().listNodes()) {
      if (!node.getMesh()) {
        continue
      }

      for (const child of node.listChildren()) {
        const name = child.getName()
        if (name.match(/\$lod\d+/)) {
          child.detach()
          count += 1
          continue
        }
      }
    }
    if (count) {
      logger.debug(`removed ${count} LODs`)
    }
  })
}
