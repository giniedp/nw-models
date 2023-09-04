import { Document, Format, NodeIO, Transform } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco, prune, textureCompress, unpartition } from '@gltf-transform/functions'

import draco3d from 'draco3dgltf'
import * as path from 'path'
import sharp from 'sharp'
import { Appearance } from '../../types'
import { writeFile, writeFileBinary } from '../../utils/file-utils'
import { logger } from '../../utils/logger'
import { MaterialObject } from '../mtl'
import { nwAppearance } from './extensions/nw-appearance'
import { NwAppearanceExtension } from './extensions/nw-appearance-extension'
import { computeNormals } from './transform/compute-normals'
import { mergeScenes } from './transform/merge-scenes'
import { removeSkinning } from './transform/remove-skinning'
import { removeVertexColor } from './transform/remove-vertex-color'
//import { toktx } from './transform/toktx';

export async function transformGltf({
  meshes,
  appearance,
  output,
  update,
  withDraco,
  withWebp,
  withKtx
}: {
  meshes: Array<{
    model: string
    material: MaterialObject[]
  }>
  appearance: Appearance
  output: string
  update: boolean
  withDraco?: boolean
  withWebp?: boolean
  withKtx?: boolean
}) {
  const io = new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwAppearanceExtension]).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
    'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
  })

  let document: Document
  for (const mesh of meshes) {
    const doc = await transformFile({
      input: mesh.model,
      material: mesh.material,
      appearance: appearance,
    })
    if (!document) {
      document = doc
    } else {
      document.merge(doc)
    }
  }

  const transforms: Transform[] = []

  if (meshes.length > 1) {
    transforms.push(mergeScenes())
  }

  transforms.push(unpartition())
  if (withDraco) {
    transforms.push(draco({}))
  }

  if (withWebp) {
    transforms.push(textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      // resize: [1024, 2024],
    }))
  } else if (withKtx) {
    // const slotsUASTC = /.*/;
    // transforms.push(
    //   toktx({ mode: Mode.UASTC, slots: slotsUASTC, level: 4, rdo: 4, zstd: 18 }),
    //   toktx({ mode: Mode.ETC1S, quality: 255 }),
    // );
  }

  await document.transform(...transforms)

  if (path.extname(output) === '.glb') {
    await writeGlb(io, output, document)
  } else {
    await writeGltf(io, output, document)
  }
}

async function writeGltf(io: NodeIO, output: string, document: Document) {
  const result = await io.writeJSON(document, {
    format: Format.GLTF,
  })
  for (const img of result.json.images || []) {
    img.uri = `data:${img.mimeType};base64,` + Buffer.from(result.resources[img.uri]).toString('base64')
  }
  for (const buf of result.json.buffers || []) {
    buf.uri = `data:application/octet-stream;base64,` + Buffer.from(result.resources[buf.uri]).toString('base64')
  }
  await writeFile(output, JSON.stringify(result.json, null, 2), {
    createDir: true,
    encoding: 'utf-8',
  })
}

async function writeGlb(io: NodeIO, output: string, document: Document) {
  await document.transform(unpartition())
  const binary = await io.writeBinary(document)
  await writeFileBinary(output.replace('.gltf', '.glb'), binary, {
    createDir: true,
  })
}

async function transformFile({
  input,
  material,
  appearance,
}: {
  input: string
  material: MaterialObject[]
  appearance: Appearance
}) {
  const io = new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwAppearanceExtension])
  const jsonDocument = await io.readAsJSON(input)
  const document = await io.readJSON(jsonDocument)
  document.setLogger(logger)

  await document.transform(removeSkinning(),
    // vertex color channels are somtetimes white but sometimes black
    // default shader implementation multiplies vertex color with base color
    // which then sometimes results in black color, thus removing vertex channel here
    removeVertexColor(),
    // normal channels are present though all zeros
    // thus computing normals here
    computeNormals({
      overwrite: true,
    }),
    nwAppearance({
      appearance,
      materials: material,
      bake: true,
    }),
    prune({}),
  )

  return document
}
