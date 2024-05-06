import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkCompiledExtToIntMap extends Chunk {
  vertices: number[]
}

export function isChunkCompiledExtToIntMap(it: Chunk): it is ChunkCompiledExtToIntMap {
  return it?.header?.type === ChunkType.CompiledExt2IntMap
}

registerChunk<ChunkCompiledExtToIntMap>({
  type: ChunkType.CompiledExt2IntMap,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    const count = chunk.header.size / 2
    chunk.vertices = r.readUInt16Array(count)
    return chunk
  },
})
