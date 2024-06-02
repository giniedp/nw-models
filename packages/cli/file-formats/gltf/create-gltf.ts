import { Document, Format, NodeIO, Transform } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco, prune, textureCompress, unpartition } from '@gltf-transform/functions'

import draco3d from 'draco3dgltf'
import path from 'node:path'
import sharp from 'sharp'
import { Appearance, ModelAnimation } from '../../types'
import { replaceExtname, writeFile, writeFileBinary } from '../../utils/file-utils'
import { logger } from '../../utils/logger'
import { NwMaterialExtension } from './nw-material/extension'
import { nwMaterial } from './nw-material/transform'
import { appendAnimations, appendCameras, appendEntities, appendLights, appendModels } from './from-cgf'
import {
  CgfCameraInput,
  CgfEntityInput,
  CgfLightInput,
  CgfModelInput,
  CgfResolver,
  MtlResolver,
} from './from-cgf/types'
import { computeNormals } from './transform/compute-normals'
import { mergeSkins } from './transform/merge-skins'
import { removeLod } from './transform/remove-lod'
import { removeVertexColor } from './transform/remove-vertex-color'
import { stubMissingMaterials } from './transform/stub-missing-materials'
import { uniqTextures } from './transform/uniq-textures'
//import { toktx } from './transform/toktx';

export async function createGltf({
  meshes,
  lights,
  cameras,
  entities,
  appearance,
  animations,
  output,
  embedData,
  withDraco,
  textureFormat,
  textureQuality,
  resolveCgf,
  resolveMtl,
}: {
  meshes: CgfModelInput[]
  lights?: CgfLightInput[]
  cameras?: CgfCameraInput[]
  entities?: CgfEntityInput[]
  animations?: ModelAnimation[]
  appearance?: Appearance | boolean
  output: string
  embedData?: boolean
  withDraco?: boolean
  textureFormat?: 'jpeg' | 'png' | 'webp' | 'avif'
  textureQuality?: number
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
    nwMaterial({
      appearance,
    }),
    stubMissingMaterials({ outFile: output }),
    unpartition(),
    uniqTextures(),
    prune({
      keepSolidTextures: true,
    }),
    appendLights({ lights }),
    appendCameras({ cameras }),
    appendEntities({ entities }),
  ]

  if (withDraco) {
    transforms.push(draco({}))
  }

  if (textureFormat) {
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        quality: textureQuality || null,
        slots: /(baseColor|diffuse|specularGlossiness|emissive|occlusion)/,
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        lossless: true,
        slots: /(normal)/,
      }),
      // HINT: do not convert mask texture to webp. It will get pre multiplied by alpha and may loose rgb masking values
    )
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
  return new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwMaterialExtension]).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
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
      let ext = '.bin'
      if (img.mimeType === 'image/jpeg') {
        ext = '.jpg'
      }
      if (img.mimeType === 'image/png') {
        ext = '.png'
      }
      if (img.mimeType === 'image/webp') {
        ext = '.webp'
      }
      if (img.mimeType === 'image/avif') {
        ext = '.avif'
      }
      const buffer = result.resources[img.uri]
      const file = replaceExtname(output, `.${i++}${ext}`)
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
