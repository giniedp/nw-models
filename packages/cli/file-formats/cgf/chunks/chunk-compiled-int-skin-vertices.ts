import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { IntSkinVertex, readIntSkinVertex } from './types'

export interface ChunkCompiledIntSkinVertices extends Chunk {
  vertices: IntSkinVertex[]
}

export function isChunkCompiledIntSkinVertices(it: Chunk): it is ChunkCompiledIntSkinVertices {
  return it?.header?.type === ChunkType.CompiledIntSkinVertices
}

registerChunk<ChunkCompiledIntSkinVertices>({
  type: ChunkType.CompiledIntSkinVertices,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    r.seekRelative(32) // reserved
    const count = (chunk.header.size - 32) / 64
    chunk.vertices = []
    for (let i = 0; i < count; i++) {
      chunk.vertices.push(readIntSkinVertex(r))
    }
    return chunk
  },
})
