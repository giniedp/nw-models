import * as fs from 'fs'
import * as path from 'path'
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
  const mtl = table.find((it) => it.type === ChunkType.MtlName)
  if (!mtl) {
    return null
  }
  reader.seekAbsolute(mtl.offset)
  return reader.readString(mtl.size).replace(/\x00+$/, '')
}

export async function getMaterialFileForSkin(assetsDir: string, skinFile: string) {
  const mtlName = await getMaterialNameForSkin(path.join(assetsDir, skinFile))
  if (!mtlName) {
    return null
  }

  const mtlFile = path.join(path.dirname(skinFile), mtlName + '.mtl')
  const absFile = path.join(assetsDir, mtlFile)
  if (fs.existsSync(absFile)) {
    return mtlFile
  }
  logger.warn('missing', absFile, `(${skinFile})`)
  return null
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
