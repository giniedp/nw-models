import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkHelper extends Chunk {
  type: number
  size: [number, number, number]
}

export function isChunkHelper(value: Chunk): value is ChunkHelper {
  return value?.header?.type === ChunkType.Helper
}

registerChunk<ChunkHelper>({
  type: ChunkType.Helper,
  version: 0x0744,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    // STRUCT_INFO_BEGIN(HELPER_CHUNK_DESC_0744)
    // STRUCT_VAR_INFO(type, TYPE_INFO(HelperTypes))
    // STRUCT_VAR_INFO(size, TYPE_INFO(Vec3))
    // STRUCT_INFO_END(HELPER_CHUNK_DESC_0744)
    chunk.type = r.readUInt32()
    chunk.size = r.readFloat32Array(3) as [number, number, number]
    chunk.debug = () => [chunk.type, ...chunk.size]
    return chunk
  },
})
