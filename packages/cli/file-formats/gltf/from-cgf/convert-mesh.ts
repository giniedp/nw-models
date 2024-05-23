import { Accessor, Document, Material } from '@gltf-transform/core'
import { MeshSubset } from 'file-formats/cgf/chunks/types'
import { BinaryReader } from '../../cgf/binary-reader'
import { ChunkMesh, isChunkDataStream, isChunkMeshSubsets, isChunkMtlName } from '../../cgf/chunks'
import { Chunk, DataStreamType } from '../../cgf/types'
import { cryToGltfQuatTypedArray, cryToGltfVec3TypedArray } from '../utils/math'

export function convertMesh({
  gltf,
  chunk,
  chunks,
  materials,
}: {
  gltf: Document
  chunk: ChunkMesh
  chunks: Chunk[]
  materials: Material[]
}) {
  const subset = chunks.find((it) => it.header.id === chunk.subsetsChunkId)

  chunks.filter(isChunkMtlName)
  if (!isChunkMeshSubsets(subset)) {
    return null
  }

  const gltfMesh = gltf.createMesh()

  for (const subChunk of subset.subsets) {
    let gltfMaterial: Material = null
    if (subChunk.materialId >= 0 && materials?.length) {
      gltfMaterial = materials?.[subChunk.materialId] ?? materials?.[0]
    }
    if (gltfMaterial?.getName()?.match(/shadow_proxy/)) {
      continue
    }

    const data = convertAttributes({ gltf, subChunk, chunk, chunks })
    if (!data.indices) {
      continue
    }

    const gltfPrimitive = gltf.createPrimitive()
    gltfPrimitive.setMode(4) // TRIANGLES
    gltfPrimitive.setIndices(data.indices)
    for (const [key, value] of Object.entries(data.attributes)) {
      gltfPrimitive.setAttribute(key, value)
    }
    if (gltfMaterial) {
      gltfPrimitive.setMaterial(gltfMaterial)
    }

    gltfMesh.addPrimitive(gltfPrimitive)
  }

  return gltfMesh
}

interface ConvertedAttributes {
  indices: Accessor
  attributes: Record<string, Accessor>
}

function convertAttributes({
  gltf,
  subChunk,
  chunk,
  chunks,
}: {
  gltf: Document
  subChunk: MeshSubset
  chunk: ChunkMesh
  chunks: Chunk[]
}): ConvertedAttributes {
  const result: ConvertedAttributes = {
    indices: null,
    attributes: {},
  }

  for (let i = 0; i < chunk.streamChunkID.length; i++) {
    const ids = chunk.streamChunkID[i]
    const id = ids.find((id) => id !== 0)
    const stream = chunks.find((it) => it.header.id === id)

    if (!stream || !isChunkDataStream(stream)) {
      continue
    }

    switch (stream.streamType) {
      case DataStreamType.INDICES: {
        if (stream.elementSize === 2) {
          const data = new Uint16Array(stream.data)
            .slice(subChunk.firstIndex, subChunk.firstIndex + subChunk.numIndices)
            .map((it) => it - subChunk.firstVertex)

          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('INDICES')
          accessor.setType('SCALAR')
          result.indices = accessor
        } else if (stream.elementSize === 4) {
          const data = new Uint32Array(stream.data)
            .slice(subChunk.firstIndex, subChunk.firstIndex + subChunk.numIndices)
            .map((it) => it - subChunk.firstVertex)
          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('INDICES')
          accessor.setType('SCALAR')
          result.indices = accessor
        } else {
          console.warn(`skip indices with element size ${stream.elementSize}`)
        }
        break
      }
      case DataStreamType.POSITIONS: {
        if (stream.elementSize === 12) {
          const data = new Float32Array(stream.data).slice(
            3 * subChunk.firstVertex,
            3 * (subChunk.firstVertex + subChunk.numVertices),
          )
          cryToGltfVec3TypedArray(data)
          const accessor = gltf.createAccessor()
          accessor.setType('VEC3')
          accessor.setName('POSITION')
          accessor.setArray(data)
          result.attributes['POSITION'] = accessor
        } else if (stream.elementSize === 8) {
          const tmpData = new Uint16Array(stream.data).slice(
            4 * subChunk.firstVertex,
            4 * (subChunk.firstVertex + subChunk.numVertices),
          )
          const data = new Float32Array(subChunk.numVertices * 3)
          for (let i = 0, j = 0; i < tmpData.length; i += 4, j += 3) {
            data[j] = decodeFloat16(tmpData[i])
            data[j + 1] = decodeFloat16(tmpData[i + 1])
            data[j + 2] = decodeFloat16(tmpData[i + 2])
          }
          cryToGltfVec3TypedArray(data)

          const accessor = gltf.createAccessor()
          accessor.setType('VEC3')
          accessor.setName('POSITION')
          accessor.setArray(data)
          result.attributes['POSITION'] = accessor
        } else {
          console.warn(`skip positions with element size ${stream.elementSize}`)
        }
        break
      }
      case DataStreamType.NORMALS: {
        if (stream.elementSize === 12) {
          const data = new Float32Array(stream.data).slice(
            3 * subChunk.firstVertex,
            3 * (subChunk.firstVertex + subChunk.numVertices),
          )
          cryToGltfVec3TypedArray(data)
          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('NORMAL')
          accessor.setType('VEC3')
          accessor.setNormalized(true)
          result.attributes['NORMAL'] = accessor
        } else {
          console.warn(`skip normals with element size ${stream.elementSize}`)
        }
        break
      }
      case DataStreamType.TEXCOORDS: {
        if (stream.elementSize === 8) {
          const data = new Float32Array(stream.data).slice(
            2 * subChunk.firstVertex,
            2 * (subChunk.firstVertex + subChunk.numVertices),
          )
          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('TEXCOORD_0')
          accessor.setType('VEC2')
          result.attributes['TEXCOORD_0'] = accessor
        } else {
          console.warn(`skip texcoords with element size ${stream.elementSize}`)
        }
        break
      }

      case DataStreamType.TANGENTS: {
        if (stream.elementSize === 16) {
          const data = new Int16Array(stream.data).slice(
            4 * 2 * subChunk.firstVertex,
            4 * 2 * (subChunk.firstVertex + subChunk.numVertices),
          )

          const tangents = new Float32Array(subChunk.numVertices * 4)
          const normals = new Float32Array(subChunk.numVertices * 3)

          for (let i = 0; i < subChunk.numVertices; i++) {
            const tx = (tangents[i * 4 + 0] = data[i * 4 + 0] / 32767)
            const ty = (tangents[i * 4 + 1] = data[i * 4 + 1] / 32767)
            const tz = (tangents[i * 4 + 2] = data[i * 4 + 2] / 32767)
            const tw = (tangents[i * 4 + 3] = data[i * 4 + 3] / 32767)
            if (Math.abs(tw) !== 1) {
              console.log(tw)
            }
            const bx = data[i * 4 + 4] / 32767
            const by = data[i * 4 + 5] / 32767
            const bz = data[i * 4 + 6] / 32767
            // calculate normals from cross product of tangent and bitangent using w
            const nx = (ty * bz - tz * by) * tw
            const ny = (tz * bx - tx * bz) * tw
            const nz = (tx * by - ty * bx) * tw
            normals[i * 3 + 0] = nx
            normals[i * 3 + 1] = ny
            normals[i * 3 + 2] = nz
          }
          cryToGltfVec3TypedArray(normals)
          cryToGltfQuatTypedArray(tangents)

          const gltfNormals = gltf.createAccessor()
          gltfNormals.setArray(normals)
          gltfNormals.setName('NORMAL')
          gltfNormals.setType('VEC3')
          result.attributes['NORMAL'] = gltfNormals

          const gltfTangents = gltf.createAccessor()
          gltfTangents.setArray(tangents)
          gltfTangents.setName('TANGENT')
          gltfTangents.setType('VEC4')
          result.attributes['TANGENT'] = gltfTangents
        } else {
          console.warn(`skip tangents with element size ${stream.elementSize}`)
        }
        // if (stream.elementSize === 8) {
        //   const data = new Int8Array(stream.data)
        //   const tangents = new Float32Array(data.length)
        //   for (let i = 0; i < data.length; i++) {
        //     tangents[i] = data[i] / 127
        //   }
        // }
        break
      }
      case DataStreamType.COLORS: {
        if (stream.elementSize === 4) {
          const data = new Uint8Array(stream.data).slice(
            4 * subChunk.firstVertex,
            4 * (subChunk.firstVertex + subChunk.numVertices),
          )
          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('COLOR_0')
          accessor.setType('VEC4')
          accessor.setNormalized(true)
          result.attributes['COLOR_0'] = accessor
        } else {
          console.warn(`skip colors with element size ${stream.elementSize}`)
        }
        break
      }
      case DataStreamType.COLORS2: {
        if (stream.elementSize === 4) {
          const data = new Uint8Array(stream.data).slice(
            4 * subChunk.firstVertex,
            4 * (subChunk.firstVertex + subChunk.numVertices),
          )
          const accessor = gltf.createAccessor()
          accessor.setArray(data)
          accessor.setName('COLOR_1')
          accessor.setType('VEC4')
          accessor.setNormalized(true)
          result.attributes['COLOR_1'] = accessor
        } else {
          console.warn(`skip colors with element size ${stream.elementSize}`)
        }
        break
      }
      case DataStreamType.BONEMAPPING: {
        if (stream.elementSize === 8) {
          const reader = new BinaryReader(
            stream.data.slice(8 * subChunk.firstVertex, 8 * (subChunk.firstVertex + subChunk.numVertices)),
          )
          const boneIdx: number[] = []
          const weights: number[] = []
          for (let i = 0; i < subChunk.numVertices; i++) {
            for (let j = 0; j < 4; j++) {
              boneIdx.push(reader.readUInt8())
            }
            for (let j = 0; j < 4; j++) {
              weights.push(reader.readUInt8() / 255)
            }
          }

          const accJoints = gltf.createAccessor()
          accJoints.setArray(new Uint8Array(boneIdx))
          accJoints.setName('JOINTS_0')
          accJoints.setType('VEC4')
          result.attributes['JOINTS_0'] = accJoints

          const accWeights = gltf.createAccessor()
          accWeights.setArray(new Float32Array(weights))
          accWeights.setName('WEIGHTS_0')
          accWeights.setType('VEC4')
          result.attributes['WEIGHTS_0'] = accWeights
        } else if (stream.elementSize === 12) {
          const reader = new BinaryReader(
            stream.data.slice(12 * subChunk.firstVertex, 12 * (subChunk.firstVertex + subChunk.numVertices)),
          )
          const boneIdx: number[] = []
          const weights: number[] = []
          for (let i = 0; i < subChunk.numVertices; i++) {
            for (let j = 0; j < 4; j++) {
              boneIdx.push(reader.readUInt16())
            }
            for (let j = 0; j < 4; j++) {
              weights.push(reader.readUInt8() / 255)
            }
          }

          const accJoints = gltf.createAccessor()
          accJoints.setName('JOINTS_0')
          accJoints.setType('VEC4')
          accJoints.setArray(new Uint8Array(boneIdx))
          result.attributes['JOINTS_0'] = accJoints

          const accWeights = gltf.createAccessor()
          accWeights.setName('WEIGHTS_0')
          accWeights.setType('VEC4')
          accWeights.setArray(new Float32Array(weights))
          result.attributes['WEIGHTS_0'] = accWeights
        } else {
          console.warn(`skip bone mapping with element size ${stream.elementSize}`)
        }
        break
      }
      default: {
        console.warn(`skip stream type ${stream.streamTypeName}`)
      }
    }
  }
  return result
}

function decodeFloat16(binary: number) {
  const exponent = (binary & 0x7c00) >> 10
  const fraction = binary & 0x03ff
  return (
    (binary >> 15 ? -1 : 1) *
    (exponent
      ? exponent === 0x1f
        ? fraction
          ? NaN
          : Infinity
        : Math.pow(2, exponent - 15) * (1 + fraction / 0x400)
      : 6.103515625e-5 * (fraction / 0x400))
  )
}
