import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface RangeEntity {
  name: string
  start: number
  end: number
}
export interface ChunkTiming extends Chunk {
  secsPerTick: number
  ticksPerFrame: number
  globalRange: any
  subRanges: number
}

export function isChunkTiming(it: Chunk): it is ChunkTiming {
  return it?.header?.type === ChunkType.Timing
}

registerChunk<ChunkTiming>({
  type: ChunkType.Timing,
  version: 0x918,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(TIMING_CHUNK_DESC_0918)
    // STRUCT_VAR_INFO(m_SecsPerTick, TYPE_INFO(float))
    // STRUCT_VAR_INFO(m_TicksPerFrame, TYPE_INFO(int))
    // STRUCT_VAR_INFO(global_range, TYPE_INFO(RANGE_ENTITY))
    // STRUCT_VAR_INFO(qqqqnSubRanges, TYPE_INFO(int))
    // STRUCT_INFO_END(TIMING_CHUNK_DESC_0918)
    chunk.secsPerTick = r.readFloat32()
    chunk.ticksPerFrame = r.readInt32()
    chunk.globalRange = {
      name: r.readString(32),
      start: r.readInt32(),
      end: r.readInt32(),
    }
    chunk.subRanges = r.readInt32()
    return chunk
  },
})
