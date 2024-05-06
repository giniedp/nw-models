import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { BoneData, readBoneData } from './types'

export interface ChunkCompiledBones extends Chunk {
  bones: BoneData[]
}

export function isChunkCompiledBones(it: Chunk): it is ChunkCompiledBones {
  return it?.header?.type === ChunkType.CompiledBones
}

registerChunk<ChunkCompiledBones>({
  type: ChunkType.CompiledBones,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    r.seekRelative(32)
    const boneCount = (chunk.header.size - 32) / 584
    chunk.bones = []
    for (let i = 0; i < boneCount; i++) {
      chunk.bones.push(readBoneData(r))
    }
    return chunk
  },
})
