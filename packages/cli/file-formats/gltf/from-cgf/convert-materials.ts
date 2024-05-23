import type { Document } from '@gltf-transform/core'
import { createHash } from 'crypto'
import type { MtlObject } from '../../../file-formats/mtl'
import type { ChunkMtlName } from '../../cgf/chunks'

export function convertMaterials({
  gltf,
  chunk,
  materials,
}: {
  gltf: Document
  chunk: ChunkMtlName
  materials: MtlObject[]
}) {
  if (materials?.length) {
    for (const mtl of materials) {
      if (!mtl.Name) {
        mtl.Name = createHash('sha256').update(JSON.stringify(mtl)).digest('hex')
      }
      gltf.createMaterial(mtl.Name)
    }
  } else if (chunk.childNames?.length) {
    for (const childName of chunk.childNames) {
      gltf.createMaterial(childName)
    }
  }
}
