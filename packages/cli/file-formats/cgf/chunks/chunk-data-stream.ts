import { Chunk, ChunkType, DataStreamType } from '../types'
import { registerChunk } from './registry'

export interface ChunkDataStream extends Chunk {
  flags: number // int
  streamType: DataStreamType // int Stream type one of ECgfStreamType.
  streamTypeName: string
  streamIndex: number // int To handle multiple streams of the same type
  elementCount: number // int Number of elements.
  elementSize: number // int Element Size.
  //reserved[2];
  data: ArrayBuffer
}

export function isChunkDataStream(it: Chunk): it is ChunkDataStream {
  return it?.header?.type === ChunkType.DataStream
}

registerChunk<ChunkDataStream>({
  type: ChunkType.DataStream,
  version: 0x0801,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    chunk.flags = r.readUInt32()
    chunk.streamType = r.readUInt32() as DataStreamType
    chunk.streamTypeName = DataStreamType[chunk.streamType]
    chunk.streamIndex = r.readUInt32()
    chunk.elementCount = r.readUInt32()
    chunk.elementSize = r.readUInt32()
    r.seekRelative(8)
    chunk.data = r.slice(chunk.elementCount * chunk.elementSize)
    return chunk
  },
})
