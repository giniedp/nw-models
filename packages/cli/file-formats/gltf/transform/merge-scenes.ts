import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function mergeScenes() {
  return createTransform('merge-scenes', (doc: Document) => {
    const scenes = doc.getRoot().listScenes()
    if (scenes.length <= 1) {
      return
    }
    let count = 0
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
      count++
    }
    if (count) {
      doc.getLogger().debug(`Merged ${count} scenes into the default scene.`)
    }
  })
}
