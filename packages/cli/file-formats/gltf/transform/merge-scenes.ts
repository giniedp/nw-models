import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function mergeScenes() {
  return createTransform('mergeScenes', (doc: Document) => {
    const scenes = doc.getRoot().listScenes()

    if (scenes.length <= 1) {
      return
    }
    const result = doc.createScene()
    for (const scene of scenes) {
      const children = scene.listChildren()
      for (const child of children) {
        result.addChild(child)
      }
    }
    doc.getRoot().setDefaultScene(result)
  })
}
