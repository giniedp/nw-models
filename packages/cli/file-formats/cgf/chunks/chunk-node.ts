import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkNode extends Chunk {
  name: string
  objectId: number
  parentId: number
  numChildren: number
  materialId: number
  transform: number[]
  positionControllerId: number
  rotationControllerId: number
  scaleControllerId: number
  propertyString: string
}

export function isChunkNode(value: Chunk): value is ChunkNode {
  return value?.header?.type === ChunkType.Node
}

registerChunk<ChunkNode>({
  type: ChunkType.Node,
  version: 0x0824,
  reader: async (r, chunk) => {
    // STRUCT_INFO_BEGIN(NODE_CHUNK_DESC_0824)
    // STRUCT_VAR_INFO(name, TYPE_ARRAY(64, TYPE_INFO(char)))
    // STRUCT_VAR_INFO(ObjectID, TYPE_INFO(int))
    // STRUCT_VAR_INFO(ParentID, TYPE_INFO(int))
    // STRUCT_VAR_INFO(nChildren, TYPE_INFO(int))
    // STRUCT_VAR_INFO(MatID, TYPE_INFO(int))
    // STRUCT_VAR_INFO(_obsoleteA_, TYPE_ARRAY(4, TYPE_INFO(uint8)))
    // STRUCT_VAR_INFO(tm, TYPE_ARRAY(4, TYPE_ARRAY(4, TYPE_INFO(float))))
    // STRUCT_VAR_INFO(_obsoleteB_, TYPE_ARRAY(3, TYPE_INFO(float)))
    // STRUCT_VAR_INFO(_obsoleteC_, TYPE_ARRAY(4, TYPE_INFO(float)))
    // STRUCT_VAR_INFO(_obsoleteD_, TYPE_ARRAY(3, TYPE_INFO(float)))
    // STRUCT_VAR_INFO(pos_cont_id, TYPE_INFO(int))
    // STRUCT_VAR_INFO(rot_cont_id, TYPE_INFO(int))
    // STRUCT_VAR_INFO(scl_cont_id, TYPE_INFO(int))
    // STRUCT_VAR_INFO(PropStrLen, TYPE_INFO(int))
    // STRUCT_INFO_END(NODE_CHUNK_DESC_0824)

    r.seekAbsolute(chunk.header.offset)
    chunk.name = r.readStringNT(64)
    chunk.objectId = r.readInt32()
    chunk.parentId = r.readInt32()
    chunk.numChildren = r.readInt32()
    chunk.materialId = r.readInt32()
    r.seekRelative(4)
    chunk.transform = r.readFloat32Array(16)
    chunk.transform[12] *= 0.01
    chunk.transform[13] *= 0.01
    chunk.transform[14] *= 0.01
    chunk.transform[15] = 1
    r.readFloat32Array(3)
    r.readFloat32Array(4)
    r.readFloat32Array(3)
    chunk.positionControllerId = r.readInt32()
    chunk.rotationControllerId = r.readInt32()
    chunk.scaleControllerId = r.readInt32()
    const propertyStringLength = r.readInt32()
    if (propertyStringLength) {
      chunk.propertyString = r.readStringNT(propertyStringLength)
    }

    chunk.debug = () => {
      return ['parent', chunk.parentId, 'object', chunk.objectId, 'material', chunk.materialId, chunk.name, ...chunk.transform]
    }
    return chunk
  },
})
