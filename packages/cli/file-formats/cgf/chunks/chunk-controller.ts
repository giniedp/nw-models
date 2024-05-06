import { BinaryReader } from '../binary-reader'
import { Chunk, ChunkType } from '../types'
import { registerChunk } from './registry'
import { ECompressionFormat, EKeyTimesFormat } from './types'
import Long from 'long'

export interface ChunkController extends Chunk {
  controllerId: number
  flags: number

  rotationKeys: number[][]
  rotationTimeKeys: number[]
  positionKeys: Array<[number, number, number]>
  positionTimeKeys: number[]
}

export function isChunkController(value: any): value is ChunkController {
  return (value as Chunk)?.header?.type === ChunkType.Controller
}

registerChunk<ChunkController>({
  type: ChunkType.Controller,
  version: 0x831,
  reader: async (r, chunk) => {
    r.seekAbsolute(chunk.header.offset)

    chunk.controllerId = r.readUInt32() // TYPE_INFO(unsigned int)
    chunk.flags = r.readUInt32() // Type_info(unsigned int)
    const numRotationKeys = r.readUInt16() // TYPE_INFO(uint16)
    const numPositionKeys = r.readUInt16() // TYPE_INFO(uint16)
    const rotationFormat = r.readUInt8() // TYPE_INFO(uint8)

    const rotationTimeFormat = r.readUInt8() // TYPE_INFO(uint8)
    const positionFormat = r.readUInt8() // TYPE_INFO(uint8)
    const positionKeysInfo = r.readUInt8() // TYPE_INFO(uint8)
    const positionTimeFormat = r.readUInt8() // TYPE_INFO(uint8)
    const tracksAligned = r.readUInt8() // TYPE_INFO(uint8)
    r.seekAbsolute(align(r.position, 4))

    const alignment = tracksAligned ? 4 : 1

    const rotationKeys = []
    const rotationTimeKeys: number[] = []
    const positionKeys: Array<[number, number, number]> = []
    const positionTimeKeys: number[] = []

    if (numRotationKeys) {
      let start = r.position
      for (let i = 0; i < numRotationKeys; i++) {
        rotationKeys.push(readRotation(r, rotationFormat))
      }
      r.seekAbsolute(start + align(r.position - start, alignment))

      start = r.position
      for (let i = 0; i < numRotationKeys; i++) {
        rotationTimeKeys.push(readTime(r, rotationTimeFormat))
      }
      if (numPositionKeys) {
        r.seekAbsolute(start + align(r.position - start, alignment))
      }
    }

    if (numPositionKeys) {
      let start = r.position
      for (let i = 0; i < numPositionKeys; i++) {
        positionKeys.push(readPosition(r, positionFormat))
      }
      r.seekAbsolute(start + align(r.position - start, alignment))
      if (positionKeysInfo) {
        start = r.position
        for (let i = 0; i < numPositionKeys; i++) {
          positionTimeKeys.push(readTime(r, positionTimeFormat))
        }
      } else {
        positionTimeKeys.push(...rotationTimeKeys)
      }
    }

    const end = chunk.header.offset + chunk.header.size
    const remaining = end - r.position
    if (remaining !== 0) {
      console.log(`Warning: ${remaining} bytes remaining in controller chunk`)
    }

    chunk.rotationKeys = rotationKeys
    chunk.rotationTimeKeys = rotationTimeKeys
    chunk.positionKeys = positionKeys
    chunk.positionTimeKeys = positionTimeKeys
    return chunk
  },
})

export interface ChunkController_0905 extends Chunk {
  numKeyPos: number //TYPE_INFO(uint32))
  numKeyRot: number //TYPE_INFO(uint32))
  numKeyTime: number //TYPE_INFO(uint32))
  numAnims: number //TYPE_INFO(uint32))
}

export function isChunkController_0905(value: any): value is ChunkController_0905 {
  return (value as Chunk)?.header?.version === 0x0905
}

// registerChunk<ChunkController_0905>({
//   type: ChunkType.Controller,
//   version: 0x0905,
//   reader: async (r, chunk) => {
//     r.seekAbsolute(chunk.header.offset)
//     chunk.numKeyPos = r.readUInt32() //TYPE_INFO(uint32))
//     chunk.numKeyRot = r.readUInt32() //TYPE_INFO(uint32))
//     chunk.numKeyTime = r.readUInt32() //TYPE_INFO(uint32))
//     chunk.numAnims = r.readUInt32() //TYPE_INFO(uint32))
//     return chunk
//   },
// })

function compressedRotationSizeInBytes(format: ECompressionFormat) {
  switch (format) {
    case ECompressionFormat.NoCompress:
      return 4 * 4
    case ECompressionFormat.SmallTree48BitQuat:
      return 3 * 2
    case ECompressionFormat.SmallTree64BitExtQuat:
      return 4 * 2
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}
function readRotation(r: BinaryReader, format: ECompressionFormat): [number, number, number, number] {
  switch (format) {
    case ECompressionFormat.NoCompress:
      return [r.readFloat32(), r.readFloat32(), r.readFloat32(), r.readFloat32()]
    case ECompressionFormat.SmallTree48BitQuat:
      return smallTree48BitQuat(r.readUInt16(), r.readUInt16(), r.readUInt16())
    case ECompressionFormat.SmallTree64BitExtQuat: {
      return smallTree64BitQuat(r.readUInt32(), r.readUInt32())
    }
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}

function compressedPositionSizeInBytes(format: ECompressionFormat) {
  switch (format) {
    case ECompressionFormat.NoCompress:
    case ECompressionFormat.NoCompressVec3:
      return 3 * 4
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}

function readPosition(r: BinaryReader, format: ECompressionFormat): [number, number, number] {
  switch (format) {
    case ECompressionFormat.NoCompress:
    case ECompressionFormat.NoCompressVec3:
      return [r.readFloat32(), r.readFloat32(), r.readFloat32()]
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}

function compressedTimeSizeInBytes(format: EKeyTimesFormat) {
  switch (format) {
    case EKeyTimesFormat.F32:
      return 4
    case EKeyTimesFormat.UINT16:
      return 2
    case EKeyTimesFormat.Byte:
      return 1
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}

function readTime(r: BinaryReader, format: EKeyTimesFormat) {
  switch (format) {
    case EKeyTimesFormat.F32:
      return r.readFloat32()
    case EKeyTimesFormat.UINT16:
      return r.readUInt16()
    case EKeyTimesFormat.Byte:
      return r.readUInt8()
    default: {
      throw new Error(`Unknown format ${format}`)
    }
  }
}

function align(value: number, alignment: number) {
  return Math.ceil(value / alignment) * alignment
}

function smallTree48BitQuat(m1: number, m2: number, m3: number): [number, number, number, number] {
  const MAX_15BITf = 23170.0
  const RANGE_15BIT = 0.707106781186

  const l1 = new Long(m1)
  const l2 = new Long(m2)
  const l3 = new Long(m3)
  const value = l1.add(l2.shiftLeft(16)).add(l3.shiftLeft(32))
  const index = value.shiftRight(46).toInt()

  const mask = 0x7fff

  const comp: number[] = []
  let shift = 0
  let sqrsumm: number = 0

  for (let i = 0; i < 4; ++i) {
    if (i == index) {
      continue
    }

    const packed = value.shiftRight(shift).and(mask).toInt()
    comp[i] = packed / MAX_15BITf - RANGE_15BIT
    sqrsumm += comp[i] * comp[i]
    shift += 15
  }

  comp[index] = Math.sqrt(1.0 - sqrsumm) || 0

  return comp as [number, number, number, number]
}

function smallTree64BitQuat(m1: number, m2: number): [number, number, number, number] {

  const MAX_20BITf = 741454
  const RANGE_20BIT = 0.707106781186
  const MAX_21BITf = 1482909.0
  const RANGE_21BIT = 0.707106781186

  const l1 = new Long(m1)
  const l2 = new Long(m2)
  const value = l1.add(l2.shiftLeft(32))
  const index = value.shiftRightUnsigned(62).toInt() & 3
  const mask = 0xfffff

  let shift = 0
  const comp: number[] = []

  let sqrsumm = 0
  for (let i = 0, targetComponentIndex = 0; i < 4; ++i) {
    if (i == index) {
      continue
    }
    if (targetComponentIndex++ < 2) {
      const packed = value.shiftRight(shift).and(mask).toInt()
      comp[i] = packed / MAX_21BITf - RANGE_21BIT
      sqrsumm += comp[i] * comp[i]
      shift += 21
    } else {
      const packed = value.shiftRight(shift).and(mask).toInt()
      comp[i] = packed / MAX_20BITf - RANGE_20BIT
      sqrsumm += comp[i] * comp[i]
      shift += 20
    }
  }

  comp[index] = Math.sqrt(1.0 - sqrsumm) || 0

  return comp as [number, number, number, number]
}
