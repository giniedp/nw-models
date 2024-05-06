import { Document } from '@gltf-transform/core'
import { MtlObject } from '../../../file-formats/mtl'
import { ChunkMesh, isChunkDataStream, isChunkMeshSubsets, isChunkMtlName } from '../chunks'
import { Chunk, DataStreamType } from '../types'
import { BinaryReader } from '../binary-reader'
import { typedRotationsToGltfSpace, typedVectorsToGltfSpace } from './utils'

export function convertMesh({
  gltf,
  chunk,
  chunks,
  materials,
}: {
  gltf: Document
  chunk: ChunkMesh
  chunks: Chunk[]
  materials: MtlObject[]
}) {
  const subset = chunks.find((it) => it.header.id === chunk.subsetsChunkId)

  if (!isChunkMeshSubsets(subset)) {
    return null
  }

  const gltfMesh = gltf.createMesh()

  for (const subChunk of subset.subsets) {
    const gltfPrimitive = gltf.createPrimitive()
    gltfPrimitive.setMode(4) // TRIANGLES
    gltfMesh.addPrimitive(gltfPrimitive)

    const mtlNameChunk = chunks.find((it) => isChunkMtlName(it))
    if (mtlNameChunk && isChunkMtlName(mtlNameChunk)) {
      const mtlName = materials?.[subChunk.materialId]?.Name ?? mtlNameChunk.childNames?.[subChunk.materialId]
      const gltfMaterial = gltf
        .getRoot()
        .listMaterials()
        .find((it) => it.getName() === mtlName)
      gltfPrimitive.setMaterial(gltfMaterial)
    }

    for (let i = 0; i < chunk.streamChunkID.length; i++) {
      const ids = chunk.streamChunkID[i]
      const id = ids.find((id) => id !== 0)
      const stream = chunks.find((it) => it.header.id === id)

      if (!stream || !isChunkDataStream(stream)) {
        continue
      }

      switch (stream.streamType) {
        case DataStreamType.POSITIONS: {
          if (stream.elementSize === 12) {
            const data = new Float32Array(stream.data).slice(
              3 * subChunk.firstVertex,
              3 * (subChunk.firstVertex + subChunk.numVertices),
            )
            typedVectorsToGltfSpace(data)
            const accessor = gltf.createAccessor()
            accessor.setType('VEC3')
            accessor.setName('POSITION')
            accessor.setArray(data)

            gltfPrimitive.setAttribute('POSITION', accessor)
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
            typedVectorsToGltfSpace(data)
            const accessor = gltf.createAccessor()
            accessor.setArray(data)
            accessor.setName('NORMAL')
            accessor.setType('VEC3')
            accessor.setNormalized(true)

            gltfPrimitive.setAttribute('NORMAL', accessor)
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

            gltfPrimitive.setAttribute('TEXCOORD_0', accessor)
          } else {
            console.warn(`skip texcoords with element size ${stream.elementSize}`)
          }
          break
        }
        case DataStreamType.INDICES: {
          if (stream.elementSize === 2) {
            const data = new Uint16Array(stream.data)
              .slice(subChunk.firstIndex, subChunk.firstIndex + subChunk.numIndices)
              .map((it) => it - subChunk.firstVertex)

            const accessor = gltf.createAccessor()
            accessor.setArray(data)
            accessor.setName('INDICES')
            accessor.setType('SCALAR')

            gltfPrimitive.setIndices(accessor)
          } else if (stream.elementSize === 4) {
            const data = new Uint32Array(stream.data)
              .slice(subChunk.firstIndex, subChunk.firstIndex + subChunk.numIndices)
              .map((it) => it - subChunk.firstVertex)
            const accessor = gltf.createAccessor()
            accessor.setArray(data)
            accessor.setName('INDICES')
            accessor.setType('SCALAR')
            gltfPrimitive.setIndices(accessor)
          } else {
            console.warn(`skip indices with element size ${stream.elementSize}`)
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
            typedVectorsToGltfSpace(normals)
            typedRotationsToGltfSpace(tangents)

            const gltfNormals = gltf.createAccessor()
            gltfNormals.setArray(normals)
            gltfNormals.setName('NORMAL')
            gltfNormals.setType('VEC3')
            gltfPrimitive.setAttribute('NORMAL', gltfNormals)

            const gltfTangents = gltf.createAccessor()
            gltfTangents.setArray(tangents)
            gltfTangents.setName('TANGENT')
            gltfTangents.setType('VEC4')
            gltfPrimitive.setAttribute('TANGENT', gltfTangents)
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
            gltfPrimitive.setAttribute('COLOR_0', accessor)
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

            gltfPrimitive.setAttribute('COLOR_1', accessor)
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

            const accIdx = gltf.createAccessor()
            accIdx.setArray(new Uint8Array(boneIdx))
            accIdx.setName('JOINTS_0')
            accIdx.setType('VEC4')
            gltfPrimitive.setAttribute('JOINTS_0', accIdx)

            const accWeights = gltf.createAccessor()
            accWeights.setArray(new Float32Array(weights))
            accWeights.setName('WEIGHTS_0')
            accWeights.setType('VEC4')
            gltfPrimitive.setAttribute('WEIGHTS_0', accWeights)
          }
          else if (stream.elementSize === 12) {
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
            const accIdx = gltf.createAccessor()
            accIdx.setName('JOINTS_0')
            accIdx.setType('VEC4')
            accIdx.setArray(new Uint8Array(boneIdx))
            gltfPrimitive.setAttribute('JOINTS_0', accIdx)

            const accWeights = gltf.createAccessor()
            accWeights.setName('WEIGHTS_0')
            accWeights.setType('VEC4')
            accWeights.setArray(new Float32Array(weights))
            gltfPrimitive.setAttribute('WEIGHTS_0', accWeights)
          }
          else {
            console.warn(`skip bone mapping with element size ${stream.elementSize}`)
          }
          break
        }
        default: {
          console.warn(`skip stream type ${stream.streamTypeName}`)
        }
      }
    }
  }

  return gltfMesh
}
