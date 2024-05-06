import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'

export interface ChunkMotionParams extends Chunk {
  assetFlags: number // uint32
  compression: number // uint32
  ticksPerFrame: number // int32
  secsPerTick: number // f32
  start: number // int32
  end: number // int32
  moveSpeed: number // f32
  turnSpeed: number // f32
  assetTurn: number // f32
  distance: number // f32
  slope: number // f32
  startLocation: number[] // QuatT w,vx,vy,vz,tx,ty,tz
  endLocation: number[] // QuatT w,vx,vy,vz,tx,ty,tz

  lHeelStart: number // f32
  lHeelEnd: number //f32

  lToe0Start: number // f32
  lToe0End: number //f32

  rHeelStart: number // f32
  rHeelEnd: number //f32

  rToe0Start: number // f32
  rToe0End: number //f32
}

export function isChunkMotionParams(it: Chunk): it is ChunkMotionParams {
  return it?.header?.type === ChunkType.MotionParameters
}

registerChunk<ChunkMotionParams>({
  type: ChunkType.MotionParameters,
  version: 0x925,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)
    chunk.assetFlags = r.readUInt32()
    chunk.compression = r.readUInt32()
    chunk.ticksPerFrame = r.readInt32()
    chunk.secsPerTick = r.readFloat32()
    chunk.start = r.readInt32()
    chunk.end = r.readInt32()
    chunk.moveSpeed = r.readFloat32()
    chunk.turnSpeed = r.readFloat32()
    chunk.assetTurn = r.readFloat32()
    chunk.distance = r.readFloat32()
    chunk.slope = r.readFloat32()
    chunk.startLocation = r.readFloat32Array(7)
    chunk.endLocation = r.readFloat32Array(7)
    chunk.lHeelStart = r.readFloat32()
    chunk.lHeelEnd = r.readFloat32()
    chunk.lToe0Start = r.readFloat32()
    chunk.lToe0End = r.readFloat32()
    chunk.rHeelStart = r.readFloat32()
    chunk.rHeelEnd = r.readFloat32()
    chunk.rToe0Start = r.readFloat32()
    chunk.rToe0End = r.readFloat32()
    return chunk
  },
})
