import { Document, Format, NodeIO, Transform } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco, prune, textureCompress, unpartition } from '@gltf-transform/functions'

import draco3d from 'draco3dgltf'
import path from 'node:path'
import sharp from 'sharp'
import { Appearance, ModelAnimation } from '../../types'
import { replaceExtname, writeFile, writeFileBinary } from '../../utils/file-utils'
import { logger } from '../../utils/logger'
import { nwAppearance } from './extensions/nw-appearance'
import { NwAppearanceExtension } from './extensions/nw-appearance-extension'
import { appendAnimations, appendModels } from './from-cgf'
import { CgfModelInput, CgfResolver, MtlResolver } from './from-cgf/types'
import { computeNormals } from './transform/compute-normals'
import { mergeSkins } from './transform/merge-skins'
import { removeLod } from './transform/remove-lod'
import { removeVertexColor } from './transform/remove-vertex-color'
import { stubMissingMaterials } from './transform/stub-missing-materials'
import { uniqTextures } from './transform/uniq-textures'
//import { toktx } from './transform/toktx';

export async function createGltf({
  meshes,
  appearance,
  animations,
  output,
  embedData,
  withDraco,
  withWebp,
  withKtx,
  resolveCgf,
  resolveMtl,
}: {
  meshes: CgfModelInput[]
  animations?: ModelAnimation[]
  appearance?: Appearance | boolean
  output: string
  embedData?: boolean
  withDraco?: boolean
  withWebp?: boolean
  withKtx?: boolean
  resolveCgf: CgfResolver
  resolveMtl: MtlResolver
}) {
  const doc = new Document()
  doc.createBuffer('buffer')

  const scene = doc.createScene()
  doc.getRoot().setDefaultScene(scene)

  const transforms: Transform[] = [
    appendModels({
      models: meshes,
      resolveCgf,
      resolveMtl,
    }),
    mergeSkins(),
    appendAnimations({ animations }),
    removeVertexColor(),
    computeNormals({
      overwrite: true,
    }),
    removeLod(),
    nwAppearance({
      appearance,
    }),
    stubMissingMaterials({ outFile: output }),
    unpartition(),
    uniqTextures(),
    prune({
      keepSolidTextures: true,
    }),
  ]

  if (withDraco) {
    transforms.push(draco({}))
  }

  if (withWebp) {
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        //nearLossless: true,
        slots: /(baseColor|diffuse|specularGlossiness|emissive|occlusion)/,
      }),
    )
  } else if (withKtx) {
    // transforms.push(
    //   toktx({ mode: Mode.UASTC, slots: /(normal|occlusion)/, level: 4, rdo: 4, zstd: 18 }),
    //   toktx({ mode: Mode.ETC1S, quality: 255 }),
    // )
  }

  doc.setLogger(logger)
  await doc.transform(...transforms)

  if (path.extname(output) === '.glb') {
    await writeGlb(doc, output)
  } else {
    await writeGltf(doc, output, embedData)
  }
}

async function getIO() {
  return new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwAppearanceExtension]).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
    'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
  })
}
async function writeGltf(document: Document, output: string, embed: boolean) {
  const io = await getIO()
  const result = await io.writeJSON(document, {
    format: Format.GLTF,
  })

  if (embed) {
    for (const img of result.json.images || []) {
      img.uri = `data:${img.mimeType};base64,` + Buffer.from(result.resources[img.uri]).toString('base64')
    }
    for (const buf of result.json.buffers || []) {
      buf.uri = `data:application/octet-stream;base64,` + Buffer.from(result.resources[buf.uri]).toString('base64')
    }
  } else {
    let i = 0
    for (const img of result.json.images || []) {
      const buffer = result.resources[img.uri]
      const file = replaceExtname(output, `.${i++}.bin`)
      img.uri = path.basename(file)
      await writeFileBinary(file, buffer, {
        createDir: true,
      })
    }
    for (const buf of result.json.buffers || []) {
      const buffer = result.resources[buf.uri]
      const file = replaceExtname(output, `.${i++}.bin`)
      buf.uri = path.basename(file)
      await writeFileBinary(file, buffer, {
        createDir: true,
      })
    }
  }

  await writeFile(output, JSON.stringify(result.json, null, 2), {
    createDir: true,
    encoding: 'utf-8',
  })
}

async function writeGlb(document: Document, output: string) {
  const io = await getIO()
  await document.transform(unpartition())
  const binary = await io.writeBinary(document)
  await writeFileBinary(output.replace('.gltf', '.glb'), binary, {
    createDir: true,
  })
}
