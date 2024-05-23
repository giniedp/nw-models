import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkFoliageInfo extends Chunk {
  spines: number
  spinesVtx: number
  skinnedVtx: number
  boneIds: number
}

export function isChunkFoliageInfo(it: Chunk): it is ChunkFoliageInfo {
  return it?.header?.type === ChunkType.FoliageInfo
}

registerChunk<ChunkFoliageInfo>({
  type: ChunkType.FoliageInfo,
  version: 0x1,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(FOLIAGE_INFO_CHUNK_DESC)
    // STRUCT_VAR_INFO(nSpines, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSpineVtx, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSkinnedVtx, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nBoneIds, TYPE_INFO(int))
    // STRUCT_INFO_END(FOLIAGE_INFO_CHUNK_DESC)

    chunk.spines = r.readInt32()
    chunk.spinesVtx = r.readInt32()
    chunk.skinnedVtx = r.readInt32()
    chunk.boneIds = r.readInt32()

    return chunk
  },
})
