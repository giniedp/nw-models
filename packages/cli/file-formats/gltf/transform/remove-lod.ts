import { Document, MathUtils, mat4, vec3, vec4 } from '@gltf-transform/core'

export function removeLod() {
  return (doc: Document) => {
    const logger = doc.getLogger()

    const scene = doc.getRoot().getDefaultScene()
    doc
      .getRoot()
      .listNodes()
      .forEach((node) => {
        if (!node.getMesh()) {
          return
        }
        node.listChildren().forEach((child) => {
          if (child.getName().match(/\$lod\d+/)) {
            child.detach()
            logger.debug(`removeLod: ${child.getName()}`)
          }
        })
      })
  }
}
