import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkExportFlags extends Chunk {
  flags: number
  rcVersion: number
  rcVersionString: string
  assetAuthorTool: number
  authorToolVersion: number
}

export function isChunkExportFlags(it: Chunk): it is ChunkExportFlags {
  return it?.header?.type === ChunkType.ExportFlags
}

registerChunk<ChunkExportFlags>({
  type: ChunkType.ExportFlags,
  version: 0x1,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    // STRUCT_INFO_BEGIN(EXPORT_FLAGS_CHUNK_DESC)
    // STRUCT_VAR_INFO(flags, TYPE_INFO(unsigned int))
    // STRUCT_VAR_INFO(rc_version, TYPE_ARRAY(4, TYPE_INFO(unsigned int)))
    // STRUCT_VAR_INFO(rc_version_string, TYPE_ARRAY(16, TYPE_INFO(char)))
    // STRUCT_VAR_INFO(assetAuthorTool, TYPE_INFO(uint32))
    // STRUCT_VAR_INFO(authorToolVersion, TYPE_INFO(uint32))
    // STRUCT_VAR_INFO(reserved, TYPE_ARRAY(30, TYPE_INFO(unsigned int)))
    // STRUCT_INFO_END(EXPORT_FLAGS_CHUNK_DESC)

    chunk.flags = r.readInt32()
    chunk.rcVersion = r.readInt32()
    chunk.rcVersionString = r.readStringNT(16)
    chunk.assetAuthorTool = r.readInt32()
    chunk.authorToolVersion = r.readInt32()
    return chunk
  },
})
