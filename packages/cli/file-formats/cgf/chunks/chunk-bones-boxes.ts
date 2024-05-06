import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkBonesBoexes extends Chunk {
  boneId: number
  min: number[]
  max: number[]
  numIndexes: number
  indexes: number[]
}

export function isChunkBonesBoxes(it: Chunk): it is ChunkBonesBoexes {
  return it?.header?.type === ChunkType.BonesBoxes
}

registerChunk<ChunkBonesBoexes>({
  type: ChunkType.BonesBoxes,
  version: 0x0801,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    chunk.boneId = r.readInt32()
    chunk.min = r.readArray(3, () => r.readFloat32())
    chunk.max = r.readArray(3, () => r.readFloat32())
    chunk.numIndexes = r.readInt32()
    chunk.indexes = r.readArray(chunk.numIndexes, () => r.readInt32())

    return chunk
  },
})
