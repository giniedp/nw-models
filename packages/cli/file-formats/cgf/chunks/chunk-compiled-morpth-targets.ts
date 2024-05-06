import { Chunk } from '../types'
import { registerChunk } from './registry'

export interface ChunkCompiledMorphTargets_0925 extends Chunk {
  //
}

export function isChunkCompiledMorphTargets_0925(value: any): value is ChunkCompiledMorphTargets_0925 {
  return value.version === 0x2002
}

registerChunk<ChunkCompiledMorphTargets_0925>({
  type: 0xcccc2002 as any,
  version: 0x925,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    console.warn('ChunkCompiledMorphTargets_0925 not implemented')
    return chunk
  },
})
