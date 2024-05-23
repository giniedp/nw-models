import { Document, Node, mat4 } from '@gltf-transform/core'
import { Chunk, isChunkNode } from '../../cgf'
import { cryToGltfMat4, mat4IsIdentity, mat4Transpose } from '../utils/math'

export function convertNodes({
  doc,
  chunks,
  handleChunk,
}: {
  doc: Document
  chunks: Chunk[]
  handleChunk: (node: Node, chunk: Chunk) => void
}) {
  const rootNodes: Node[] = []

  const nodeLookup: Record<number, Node> = {}
  function getNode(id: number) {
    if (!nodeLookup[id]) {
      nodeLookup[id] = doc.createNode()
    }
    return nodeLookup[id]
  }

  for (const chunk of chunks) {
    if (!isChunkNode(chunk)) {
      continue
    }
    const isLOD = chunk.name.match(/\$lod\d+/i)
    if (isLOD && chunk.objectId) {
      continue
    }

    const node = getNode(chunk.header.id).setName(chunk.name)
    if (!mat4IsIdentity(chunk.transform as mat4)) {
      node.setMatrix(cryToGltfMat4(mat4Transpose(chunk.transform as mat4)))
    }

    if (chunk.parentId === -1) {
      rootNodes.push(node)
    } else {
      getNode(chunk.parentId).addChild(node)
    }

    const mtlChunk = chunks.find((it) => it.header.id === chunk.materialId)
    const objectChunk = chunks.find((it) => it.header.id === chunk.objectId)
    if (objectChunk) {
      handleChunk(node, objectChunk)
    }
  }
  return rootNodes
}
