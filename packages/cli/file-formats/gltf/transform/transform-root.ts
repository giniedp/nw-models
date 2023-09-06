import { Document, MathUtils, mat4, vec3, vec4 } from '@gltf-transform/core'

export function transformRoot({ matrix }: { matrix: mat4 }) {
  return (doc: Document) => {
    if (!matrix) {
      return
    }
    const logger = doc.getLogger()
    if (matrix.length !== 16) {
      logger.warn(`transformRoot: matrix expected to have length of 16 but was ${matrix.length} -> skipped`)
      return
    }

    const translation: vec3 = [0, 0, 0]
    const rotation: vec4 = [0, 0, 0, 1]
    const scale: vec3 = [1, 1, 1]
    MathUtils.decompose(matrix, translation, rotation, scale)
    // logger.debug(`transformRoot: ${matrix} -> ${translation} | ${rotation} | ${scale}`)

    const scene = doc.getRoot().getDefaultScene()
    for (const child of scene.listChildren()) {
      if (child.getName() === 'Z_UP') {
        const tChild = doc.createNode('Transform')
        tChild.setTranslation(translation)
        tChild.setRotation(rotation)
        tChild.setScale(scale)
        child.listChildren().forEach((it) => {
          it.detach()
          tChild.addChild(it)
        })
        child.addChild(tChild)
      } else {
        child.setTranslation(translation)
        child.setRotation(rotation)
        child.setScale(scale)
      }
    }
  }
}
