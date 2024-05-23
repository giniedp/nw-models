import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { MeshSubset, readMeshSubset } from './types'

export interface ChunkMeshSubsets extends Chunk {
  flags: number
  subsets: MeshSubset[]
}

export function isChunkMeshSubsets(it: Chunk): it is ChunkMeshSubsets {
  return it?.header?.type === ChunkType.MeshSubsets
}

registerChunk<ChunkMeshSubsets>({
  type: ChunkType.MeshSubsets,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(MESH_SUBSETS_CHUNK_DESC_0800::MeshSubset)
    // STRUCT_VAR_INFO(nFirstIndexId, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nNumIndices, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nFirstVertId, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nNumVerts, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nMatID, TYPE_INFO(int))
    // STRUCT_VAR_INFO(fRadius, TYPE_INFO(float))
    // STRUCT_VAR_INFO(vCenter, TYPE_INFO(Vec3))
    // STRUCT_INFO_END(MESH_SUBSETS_CHUNK_DESC_0800::MeshSubset)

    // STRUCT_INFO_BEGIN(MESH_SUBSETS_CHUNK_DESC_0800::MeshBoneIDs)
    // STRUCT_VAR_INFO(numBoneIDs, TYPE_INFO(uint32))
    // STRUCT_VAR_INFO(arrBoneIDs, TYPE_ARRAY(128, TYPE_INFO(uint16)))
    // STRUCT_INFO_END(MESH_SUBSETS_CHUNK_DESC_0800::MeshBoneIDs)

    // STRUCT_INFO_BEGIN(MESH_SUBSETS_CHUNK_DESC_0800::MeshSubsetTexelDensity)
    // STRUCT_VAR_INFO(texelDensity, TYPE_INFO(float))
    // STRUCT_INFO_END(MESH_SUBSETS_CHUNK_DESC_0800::MeshSubsetTexelDensity)


    // STRUCT_INFO_BEGIN(MESH_SUBSETS_CHUNK_DESC_0800)
    // STRUCT_VAR_INFO(nFlags, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nCount, TYPE_INFO(int))
    // STRUCT_VAR_INFO(reserved, TYPE_ARRAY(2, TYPE_INFO(int)))
    // STRUCT_INFO_END(MESH_SUBSETS_CHUNK_DESC_0800)

    chunk.flags = r.readInt32()
    const count = r.readInt32()
    r.seekRelative(8)
    chunk.subsets = r.readArray(count, readMeshSubset)

    chunk.debug = () => chunk.subsets.map((it) => it.materialId)
    return chunk
  },
})
