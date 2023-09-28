import * as fs from 'fs'
import { logger } from '../../utils'

import { BinaryReader } from './binary-reader'
import { ChunkHeader, ChunkType, FileHeader, FileType, FileVersion } from './types'

export interface CgfFile {
  file: string
  header: FileHeader
  table: ChunkHeader[]
  reader?: BinaryReader
}

export async function readCgf(file: string, attachReader = false): Promise<CgfFile> {
  const buffer = await fs.promises.readFile(file)
  const reader = new BinaryReader(buffer.buffer)
  const header = readHeader(reader)
  const table = readChunkTable(reader, header)
  return {
    file: file,
    header: header,
    table: table,
    reader: attachReader ? reader : undefined,
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
  const count = reader.readByte()
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
      version: reader.readUInt() as FileVersion,
      chunkCount: reader.readUInt(),
      chunkOffset: reader.readUInt(),
    }
  }
  if (signature === '#ivo') {
    return {
      version: reader.readUInt() as FileVersion,
      chunkCount: reader.readUInt(),
      chunkOffset: reader.readUInt(),
    }
  }
  reader.seekAbsolute(0)
  if (reader.readString(8).startsWith('CryTek')) {
    return {
      type: reader.readUInt() as FileType,
      version: reader.readUInt() as FileVersion,
      chunkOffset: reader.readUInt() + 4,
      chunkCount: reader.readUInt(),
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

function readChunkHeader(reader: BinaryReader, header: FileHeader): ChunkHeader {
  if (header.version === FileVersion.CryTek1And2) {
    const type = reader.readUInt()
    const typeName = ChunkType[type]
    return {
      type: type,
      typeName: typeName,
      version: reader.readUInt(),
      offset: reader.readUInt(),
      id: reader.readInt(),
      size: 0,
    }
  }
  if (header.version === FileVersion.CryTek3) {
    const type = reader.readUInt()
    const typeName = ChunkType[type]
    return {
      type: type,
      typeName: typeName,
      version: reader.readUInt(),
      offset: reader.readUInt(),
      id: reader.readInt(),
      size: reader.readUInt(),
    }
  }
  if (header.version === FileVersion.CryTek_3_6) {
    const type = reader.readUShort() + 0xcccbf000
    const typeName = ChunkType[type]
    return {
      type: type,
      typeName: typeName,
      version: reader.readUShort(),
      id: reader.readInt(),
      size: reader.readUInt(),
      offset: reader.readUInt(),
    }
  }
  throw new Error('file not supported')
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
