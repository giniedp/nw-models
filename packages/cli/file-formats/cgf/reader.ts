import * as fs from 'fs'

import { logger } from '../../utils/logger'
import { BinaryReader } from './binary-reader'
import { isChunkMtlName, readChunk, readChunkHeader } from './chunks'
import { Chunk, ChunkHeader, ChunkType, FileHeader, FileVersion } from './types'

export interface CgfFile {
  file: string
  header: FileHeader
  table: ChunkHeader[]
  chunks?: Chunk[]
}

export type ChunkReader = (header: ChunkHeader, reader: BinaryReader) => Promise<Chunk>
export async function readCgf(file: string, readChunks: boolean | Array<ChunkType> = false): Promise<CgfFile> {
  const buffer = await fs.promises.readFile(file)
  const reader = new BinaryReader(buffer.buffer as any)
  const header = readHeader(reader)
  const table = readChunkTable(reader, header)
  let chunks: Chunk[]
  if (readChunks) {
    chunks = []
    for (const it of table) {
      if (Array.isArray(readChunks) && !readChunks.includes(it.type)) {
        continue
      }
      const chunk = await readChunk(it, reader)
      if (chunk) {
        // logger.debug(
        //   'chunk',
        //   chunk.header.typeName,
        //   '0x' + chunk.header.version.toString(16),
        //   chunk.header.id,
        //   ...(chunk.debug?.() || []),
        // )
        chunks.push(chunk)
      }
    }
  }
  return {
    file: file,
    header: header,
    table: table,
    chunks: chunks,
  }
}

export async function readCgfMaterialName(cgfFile: string) {
  if (!fs.existsSync(cgfFile)) {
    logger.warn('missing', cgfFile)
    return
  }
  const cgf = await readCgf(cgfFile, [ChunkType.MtlName])
  const mtlName = cgf.chunks.find(isChunkMtlName)
  if (!mtlName) {
    return null
  }
  return {
    assetId: mtlName.assetId,
    name: mtlName.name,
  }
}

function readHeader(reader: BinaryReader): FileHeader {
  const signature = reader.readString(4)
  if (signature === 'CrCh') {
    return {
      version: reader.readUInt32() as FileVersion,
      chunkCount: reader.readUInt32(),
      chunkOffset: reader.readUInt32(),
    }
  }
  throw new Error(`invalid signature ${signature}`)
}

function readChunkTable(reader: BinaryReader, header: FileHeader) {
  const chunkHeaders: ChunkHeader[] = []
  reader.seekAbsolute(header.chunkOffset)

  for (let i = 0; i < header.chunkCount; i++) {
    const ch = readChunkHeader(reader, header)
    chunkHeaders.push(ch)
  }
  return chunkHeaders
}
