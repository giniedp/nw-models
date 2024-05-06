import { BinaryReader } from '../binary-reader'
import { ChunkHeader, ChunkType, FileHeader } from '../types'

export function readChunkHeader(reader: BinaryReader, header: FileHeader): ChunkHeader {
  // if (header.version === FileVersion.CryTek1And2) {
  //   const type = reader.readUInt32()
  //   const typeName = ChunkType[type]
  //   return {
  //     type: type,
  //     typeName: typeName,
  //     version: reader.readUInt32(),
  //     offset: reader.readUInt32(),
  //     id: reader.readInt32(),
  //     size: 0,
  //   }
  // }
  // if (header.version === FileVersion.CryTek3) {
  //   const type = reader.readUInt32()
  //   const typeName = ChunkType[type]
  //   return {
  //     type: type,
  //     typeName: typeName,
  //     version: reader.readUInt32(),
  //     offset: reader.readUInt32(),
  //     id: reader.readInt32(),
  //     size: reader.readUInt32(),
  //   }
  // }
  if (header.version >= 0x746) {
    const type = reader.readUInt16()
    const typeName = ChunkType[type]
    return {
      type: type,
      typeName: typeName,
      version: reader.readUInt16(),
      id: reader.readInt32(),
      size: reader.readUInt32(),
      offset: reader.readUInt32(),
    }
  }
  throw new Error(`file version not supported: 0x${header.version.toFixed(16)}`)
}
