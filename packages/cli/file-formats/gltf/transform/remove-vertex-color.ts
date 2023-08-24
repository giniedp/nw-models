import { Document } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function removeVertexColor() {
  return createTransform('removeVertexColor', (doc: Document) => {
    // If vertex colors are present, the default shader uses them instead of the diffuse texture
    // We remove them for now.
    // TODO: find out what vertex colors are used for (tint?) and configure the shader that way
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives() || []) {
        primitive.getAttribute('COLOR_0')?.setBuffer?.(null)
        primitive.getAttribute('COLOR_1')?.setBuffer?.(null)
        primitive.setAttribute('COLOR_0', null)
        primitive.setAttribute('COLOR_1', null)
      }
    }
  })
}
