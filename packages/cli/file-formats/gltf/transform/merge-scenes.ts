import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function mergeScenes() {
  return createTransform('mergeScenes', (doc: Document) => {

    const scenes = doc.getRoot().listScenes()
    if (scenes.length <= 1) {
      return
    }
    const defaultScene = doc.getRoot().getDefaultScene()
    for (const scene of scenes) {
      if (scene === defaultScene) {
        continue
      }
      const children = scene.listChildren()
      for (const child of children) {
        child.detach()
        defaultScene.addChild(child)
      }
      scene.detach()
    }
  })
}
