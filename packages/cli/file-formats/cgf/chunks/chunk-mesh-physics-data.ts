import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkMehsPhysicsData extends Chunk {
  dataSize: number
  flags: number
  tetrahedraDataSize: number
  tetrahedraChunkId: number
}

export function isChunkMehsPhysicsData(it: Chunk): it is ChunkMehsPhysicsData {
  return it?.header?.type === ChunkType.MeshPhysicsData
}

registerChunk<ChunkMehsPhysicsData>({
  type: ChunkType.MeshPhysicsData,
  version: 0x800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(MESH_PHYSICS_DATA_CHUNK_DESC_0800)
    // STRUCT_VAR_INFO(nDataSize, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nFlags, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nTetrahedraDataSize, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nTetrahedraChunkId, TYPE_INFO(int))
    // STRUCT_VAR_INFO(reserved, TYPE_ARRAY(2, TYPE_INFO(int)))
    // STRUCT_INFO_END(MESH_PHYSICS_DATA_CHUNK_DESC_0800)

    chunk.dataSize = r.readInt32()
    chunk.flags = r.readInt32()
    chunk.tetrahedraDataSize = r.readInt32()
    chunk.tetrahedraChunkId = r.readInt32()
    r.readInt32Array(2)

    return chunk
  },
})
