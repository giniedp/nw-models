import { it } from 'node:test'
import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

// STRUCT_INFO_BEGIN(MTL_NAME_CHUNK_DESC_0802)
// STRUCT_VAR_INFO(name, TYPE_ARRAY(128, TYPE_INFO(char)))
// STRUCT_VAR_INFO(nSubMaterials, TYPE_INFO(int))
// STRUCT_INFO_END(MTL_NAME_CHUNK_DESC_0802)

export interface ChunkMtlName<T = unknown> extends Chunk {
  assetId?: string
  name?: string
  childNames?: string[]
  data: T
}

export interface ChunkMtlName_0800 {
  flags: number
  flags2: number
  name: string
  physicalizeType: number
  subMaterialCount: number
  subMaterialsChunkIds: number[]
  advancedDataChunkId: number
  opacity: number
  reserve: number[]
}

export function isChunkMtlName(value: Chunk): value is ChunkMtlName {
  return value?.header?.type === ChunkType.MtlName
}

registerChunk<ChunkMtlName<ChunkMtlName_0800>>({
  type: ChunkType.MtlName,
  version: 0x0800,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    // STRUCT_INFO_BEGIN(MTL_NAME_CHUNK_DESC_0800)
    // STRUCT_VAR_INFO(nFlags, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nFlags2, TYPE_INFO(int))
    // STRUCT_VAR_INFO(name, TYPE_ARRAY(128, TYPE_INFO(char)))
    // STRUCT_VAR_INFO(nPhysicalizeType, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSubMaterials, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nSubMatChunkId, TYPE_ARRAY(MTL_NAME_CHUNK_DESC_0800_MAX_SUB_MATERIALS, TYPE_INFO(int)))
    // STRUCT_VAR_INFO(nAdvancedDataChunkId, TYPE_INFO(int))
    // STRUCT_VAR_INFO(sh_opacity, TYPE_INFO(float))
    // STRUCT_VAR_INFO(reserve, TYPE_ARRAY(32, TYPE_INFO(int)))
    // STRUCT_INFO_END(MTL_NAME_CHUNK_DESC_0800)

    const flags = r.readUInt32()
    const flags2 = r.readUInt32()
    const name = r.readString(128)
    const physicalizeType = r.readUInt32()
    const subMaterialCount = r.readUInt32()
    const subMaterialsChunkIds = r.readUInt32Array(subMaterialCount)
    const advancedDataChunkId = r.readUInt32()
    const opacity = r.readFloat32()

    chunk.name = name
    chunk.data = {
      flags,
      flags2,
      name,
      physicalizeType,
      subMaterialCount,
      subMaterialsChunkIds,
      advancedDataChunkId,
      opacity,
      reserve: [],
    }

    return chunk
  },
})


export interface ChunkMtlName_0802 {
  name: string
  subMaterials: number
}

registerChunk<ChunkMtlName<ChunkMtlName_0802>>({
  type: ChunkType.MtlName,
  version: 0x0802,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    const name = r.readString(128)
    const subMaterials = r.readInt32()

    chunk.name = name
    chunk.data = {
      name,
      subMaterials,
    }

    return chunk
  },
})

registerChunk<ChunkMtlName>({
  type: ChunkType.MtlName,
  version: 0x0804,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    chunk.assetId = r.readStringNT(64)
    const count = r.readInt32()
    r.seekRelative(4 * count)
    chunk.childNames = []
    for (let i = 0; i < count; i++) {
      chunk.childNames.push(r.readStringNT())
    }
    return chunk
  },
})
