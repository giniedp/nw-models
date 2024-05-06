import { Document, Format, NodeIO, Transform } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { createTransform } from '@gltf-transform/functions'
import { computeNormals } from 'file-formats/gltf/transform/compute-normals'
import path from 'path'
import { MtlObject } from '../../../file-formats/mtl'
import { isChunkCompiledBones, isChunkMesh, isChunkMtlName } from '../chunks'
import { CgfFile, readCgf } from '../reader'
import { convertAnimations } from './convert-animations'
import { convertMaterials } from './convert-materials'
import { convertMesh } from './convert-mesh'
import { convertSkin } from './convert-skin'

export async function cgfToGltf({
  model,
  material,
  animations,
  ignoreMesh,
  ignoreBones,
}: {
  model: CgfFile
  material?: MtlObject[]
  animations?: CgfFile[]
  ignoreMesh?: boolean
  ignoreBones?: boolean
}) {
  material = material || []
  animations = animations || []
  const chunks = model.chunks
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const doc = new Document()
  doc.createBuffer('buffer')

  const scene = doc.createScene(path.basename(model.file))
  doc.getRoot().setDefaultScene(scene)

  for (const chunk of chunks) {
    if (isChunkMtlName(chunk)) {
      convertMaterials({
        gltf: doc,
        chunk,
        materials: material,
      })
    }
  }

  if (!ignoreBones) {
    for (const chunk of chunks) {
      if (isChunkCompiledBones(chunk)) {
        convertSkin({ gltf: doc, chunk })
      }
    }
  }

  if (!ignoreMesh) {
    for (const chunk of chunks) {
      if (isChunkMesh(chunk)) {
        const node = doc.createNode()
        const skin = doc.getRoot().listSkins()[0]
        const mesh = convertMesh({
          gltf: doc,
          chunk: chunk,
          chunks,
          materials: material,
        })

        node.setMesh(mesh)
        if (skin) {
          node.setSkin(skin)
        }
        scene.addChild(node)
      }
    }
  }

  if (animations?.length) {
    convertAnimations({ gltf: doc, animations })
  }
  // doc.transform(nwAppearance({
  //   appearance: null,
  //   bake: false,
  //   materials: []
  // }))
  if (!ignoreMesh) {
    await doc.transform(computeNormals({ overwrite: true }))
  }

  return writeGltf(io, doc)
}

async function writeGltf(io: NodeIO, document: Document) {
  const result = await io.writeJSON(document, {
    format: Format.GLTF,
  })
  for (const img of result.json.images || []) {
    img.uri = `data:${img.mimeType};base64,` + Buffer.from(result.resources[img.uri]).toString('base64')
  }
  for (const buf of result.json.buffers || []) {
    buf.uri = `data:application/octet-stream;base64,` + Buffer.from(result.resources[buf.uri]).toString('base64')
  }
  return result.json
}

export function appendCAF(options: { animations: string[] }): Transform {
  return createTransform('append-caf', async (doc: Document): Promise<void> => {
    const animations: CgfFile[] = []
    for (const file of options.animations || []) {
      const animation = await readCgf(file, true).catch((e) => {
        console.error('Failed to read', file, e)
        return null
      })
      if (animation) {
        animations.push(animation)
      }
    }
    convertAnimations({ gltf: doc, animations })
  })
}

export function appendCGF(options: {
  file: string
  material?: MtlObject[]
  ignoreMesh?: boolean
  ignoreBones?: boolean
}): Transform {
  return createTransform('append-svg', async (doc: Document): Promise<void> => {
    const cgf = await readCgf(options.file, true)
    const chunks = cgf.chunks

    for (const chunk of chunks) {
      if (isChunkMtlName(chunk)) {
        convertMaterials({
          gltf: doc,
          chunk,
          materials: options.material,
        })
      }
    }

    if (!options.ignoreBones) {
      for (const chunk of chunks) {
        if (isChunkCompiledBones(chunk)) {
          convertSkin({ gltf: doc, chunk })
        }
      }
    }

    if (!options.ignoreMesh) {
      for (const chunk of chunks) {
        if (isChunkMesh(chunk)) {
          const node = doc.createNode()
          const skin = doc.getRoot().listSkins()[0]
          const mesh = convertMesh({
            gltf: doc,
            chunk: chunk,
            chunks,
            materials: options.material,
          })

          node.setMesh(mesh)
          if (skin) {
            node.setSkin(skin)
          }
          doc.getRoot().getDefaultScene().addChild(node)
        }
      }
    }
  })
}
