import { Document } from '@gltf-transform/core'
import { MtlObject } from '../../../file-formats/mtl'
import { ChunkMtlName } from '../chunks'

export function convertMaterials({
  gltf,
  chunk,
  materials,
}: {
  gltf: Document
  chunk: ChunkMtlName
  materials: MtlObject[]
}) {

  // if (!chunk.childNames?.length) {
  //   return
  // }
  if (materials?.length) {
    for (const mtl of materials) {
      gltf.createMaterial(mtl.Name)
    }
  } else if (chunk.childNames?.length) {
    for (const childName of chunk.childNames) {
      gltf.createMaterial(childName)
    }
  }
}
