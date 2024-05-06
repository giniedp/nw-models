import * as fs from 'fs'
import { logger } from '../../utils'

import { BinaryReader } from './binary-reader'
import { Chunk, ChunkHeader, ChunkType, FileHeader, FileType, FileVersion } from './types'
import { readChunk, readChunkHeader } from './chunks'

export interface CgfFile {
  file: string
  header: FileHeader
  table: ChunkHeader[]
  chunks?: Chunk[]
}

export async function readCgf(file: string, readChunks = false): Promise<CgfFile> {
  const buffer = await fs.promises.readFile(file)
  const reader = new BinaryReader(buffer.buffer)
  const header = readHeader(reader)
  const table = readChunkTable(reader, header)
  const chunks = !readChunks ? undefined : await Promise.all(table.map(async (it) => readChunk(it, reader)))
  return {
    file: file,
    header: header,
    table: table,
    chunks: chunks?.filter((it) => !!it),
  }
}

export async function getMaterialNameForSkin(skinFile: string) {
  if (!fs.existsSync(skinFile)) {
    logger.warn('missing', skinFile)
    return
  }
  const buffer = await fs.promises.readFile(skinFile)
  const reader = new BinaryReader(buffer.buffer)
  const header = readHeader(reader)
  const table = readChunkTable(reader, header)
  const mtlNameChunks = table.filter((it) => it.type === ChunkType.MtlName)
  const mtl = mtlNameChunks[0]
  if (!mtl) {
    return null
  }
  reader.seekAbsolute(mtl.offset)

  let assetId: string = null
  let file: string = null
  let name: string = null
  if (reader.readString(1) !== '{') {
    reader.seekAbsolute(mtl.offset)
    file = reader.readStringNT()
    return {
      assetId: assetId,
      file: file,
      name: name,
    }
  }

  reader.seekRelative(36)
  if (reader.readString(1) !== '}') {
    return {
      assetId: assetId,
      file: file,
      name: name,
    }
  }

  reader.seekAbsolute(mtl.offset + 1)
  assetId = reader.readString(36)
  reader.seekRelative(1)
  reader.seekRelative(26)
  const count = reader.readInt8()
  reader.seekRelative(3)
  reader.seekRelative(4 * count)
  name = reader.readStringNT()
  return {
    assetId: assetId,
    file: file,
    name: name,
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
  if (signature === '#ivo') {
    return {
      version: reader.readUInt32() as FileVersion,
      chunkCount: reader.readUInt32(),
      chunkOffset: reader.readUInt32(),
    }
  }
  reader.seekAbsolute(0)
  if (reader.readString(8).startsWith('CryTek')) {
    return {
      type: reader.readUInt32() as FileType,
      version: reader.readUInt32() as FileVersion,
      chunkOffset: reader.readUInt32() + 4,
      chunkCount: reader.readUInt32(),
    }
  }
  throw new Error('file not supported')
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


export function getSkinFromCloth(file: string, attachReader = false): string {
  if (!fs.existsSync(file)) {
    return null
  }
  const data = fs.readFileSync(file, 'utf-8')
  const match = data.match(/objects[\/\\].*\.(skin|cgf)/gi)
  if (match) {
    return match[0]
  }
  return null
}
