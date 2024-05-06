import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkMesh extends Chunk {
  flags: number
  flags2: number
  vertexCount: number
  indexCount: number
  subsetCount: number
  subsetsChunkId: number
  vertAnimID: number
  streamChunkID: number[][]
  physicsDataChunkId: number[]
  bboxMin: number[]
  bboxMax: number[]
  texMappingDensity: number
  geometricMeanFaceArea: number
  reserved: number[]
}

export function isChunkMesh(value: Chunk): value is ChunkMesh {
  return value?.header?.type === ChunkType.Mesh
}

registerChunk<ChunkMesh>({
  type: ChunkType.Mesh,
  version: 0x0802,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(MESH_CHUNK_DESC_0802)
    // STRUCT_VAR_INFO(nFlags, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nFlags2, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nVerts, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nIndices, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSubsets, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSubsetsChunkId, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nVertAnimID, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nStreamChunkID, TYPE_ARRAY(16, TYPE_ARRAY(8, TYPE_INFO(int))))
    // STRUCT_VAR_INFO(nPhysicsDataChunkId, TYPE_ARRAY(4, TYPE_INFO(int)))
    // STRUCT_VAR_INFO(bboxMin, TYPE_INFO(Vec3))
    // STRUCT_VAR_INFO(bboxMax, TYPE_INFO(Vec3))
    // STRUCT_VAR_INFO(texMappingDensity, TYPE_INFO(float))
    // STRUCT_VAR_INFO(geometricMeanFaceArea, TYPE_INFO(float))
    // STRUCT_VAR_INFO(reserved, TYPE_ARRAY(30, TYPE_INFO(int)))
    // STRUCT_INFO_END(MESH_CHUNK_DESC_0802)

    chunk.flags = r.readInt32()
    chunk.flags2 = r.readInt32()
    chunk.vertexCount = r.readInt32()
    chunk.indexCount = r.readInt32()
    chunk.subsetCount = r.readInt32()
    chunk.subsetsChunkId = r.readInt32()
    chunk.vertAnimID = r.readInt32()
    chunk.streamChunkID = r.readArray(16, () => r.readArray(8, () => r.readInt32()))
    chunk.physicsDataChunkId = r.readArray(4, () => r.readInt32())
    chunk.bboxMin = r.readFloat32Array(3)
    chunk.bboxMax = r.readFloat32Array(3)
    chunk.texMappingDensity = r.readFloat32()
    chunk.geometricMeanFaceArea = r.readFloat32()
    chunk.reserved = r.readInt32Array(30)

    return chunk
  },
})
