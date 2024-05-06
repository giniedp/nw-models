import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { IntSkinFace, readIntSkinFace } from './types'

export interface ChunkCompiledIntFaces extends Chunk {
  faces: IntSkinFace[]
}

export function isChunkCompiledIntFaces(it: Chunk): it is ChunkCompiledIntFaces {
  return it?.header?.type === ChunkType.CompiledIntFaces
}

registerChunk<ChunkCompiledIntFaces>({
  type: ChunkType.CompiledIntFaces,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    const count = chunk.header.size / 6
    chunk.faces = []
    for (let i = 0; i < count; i++) {
      chunk.faces.push(readIntSkinFace(r))
    }
    return chunk
  },
})
