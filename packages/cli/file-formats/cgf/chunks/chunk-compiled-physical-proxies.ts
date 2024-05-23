import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkCompiledPhysicalProxies extends Chunk {
  numProxies: number
}

export function isChunkCompiledPhysicalProxies(value: Chunk): value is ChunkCompiledPhysicalProxies {
  return value?.header?.type === ChunkType.CompiledPhysicalProxies
}

registerChunk<ChunkCompiledPhysicalProxies>({
  type: ChunkType.CompiledPhysicalProxies,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    // STRUCT_INFO_BEGIN(COMPILED_PHYSICALPROXY_CHUNK_DESC_0800)
    // STRUCT_VAR_INFO(numPhysicalProxies, TYPE_INFO(uint32))
    // STRUCT_INFO_END(COMPILED_PHYSICALPROXY_CHUNK_DESC_0800)
    chunk.numProxies = r.readUInt32()
    return chunk
  },
})
