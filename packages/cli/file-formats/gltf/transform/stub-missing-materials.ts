import { Document, Material } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

export function stubMissingMaterials(options: { outFile: string }) {
  return createTransform('stubMissingMaterials', (doc: Document) => {
    let material: Material
    function defaultMaterial() {
      if (material) {
        return material
      }
      material = doc.createMaterial('missing')
      material.setBaseColorFactor([0.40197781, 0, 1, 1])
      material.setEmissiveFactor([0.19461785, 0.001517635, 1])
      material.setAlpha(0.5)
      material.setAlphaMode('BLEND')
      material.setDoubleSided(true)
      return material
    }
    const logger = doc.getLogger()
    // some meshes have no material attached
    for (const mesh of doc.getRoot().listMeshes()) {
      const prims = mesh.listPrimitives()
      for (let i = 0; i < prims.length; i++) {
        const prim = prims[i]
        if (!prim.getMaterial()) {
          logger.warn(`Stub missing material for ${mesh.getName()}#${i} (${options.outFile})`)
          prim.setMaterial(defaultMaterial())
        }
      }
    }
  })
}
