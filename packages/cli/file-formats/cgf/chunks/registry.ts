import { BinaryReader } from '../../../utils/binary-reader'
import { logger } from '../../../utils/logger'
import { Chunk, ChunkHeader, ChunkType } from '../types'

export type ChunkReaderFn<T extends Chunk = Chunk> = (reader: BinaryReader, output: T) => Promise<T>
export interface ChunkRegisty<T extends Chunk = Chunk> {
  type: ChunkType
  version: number
  reader: ChunkReaderFn<T>
}
const registry: Array<ChunkRegisty> = []
export function registerChunk<T extends Chunk = Chunk>(options: ChunkRegisty<T>): ChunkRegisty<T> {
  registry.push(options)
  return options
}

export async function readChunk(header: ChunkHeader, reader: BinaryReader) {
  for (const chunk of registry) {
    if (chunk.type === header.type && chunk.version === header.version) {
      reader.seekAbsolute(header.offset)
      return chunk.reader(reader, { header } as Chunk)
    }
  }
  const type = `0x${header.type.toString(16)}`
  const typeName = ChunkType[header.type] || header.type
  const version = `0x${header.version.toString(16)}`
  logger.warn(`Reader for chunk ${type} | ${typeName} with version ${version} not found`)
  return null
}
