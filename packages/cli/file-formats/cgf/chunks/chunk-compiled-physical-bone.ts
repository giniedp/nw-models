import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { BoneEntity, readBoneEntity } from './types'

export interface ChunkCompiledPhysicalBone extends Chunk {
  bones: BoneEntity[]
}

export function isChunkCompiledPhysicalBone(it: Chunk): it is ChunkCompiledPhysicalBone {
  return it?.header?.type === ChunkType.CompiledPhysicalBones
}

registerChunk<ChunkCompiledPhysicalBone>({
  type: ChunkType.CompiledPhysicalBones,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    r.seekRelative(32)
    const boneCount = (chunk.header.size - 32) / 152
    chunk.bones = []
    for (let i = 0; i < boneCount; i++) {
      chunk.bones.push(readBoneEntity(r))
    }
    return chunk
  },
})
