import { Document, Format, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { unpartition } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import path from 'node:path'
import { replaceExtname, writeFile, writeFileBinary } from '../../utils/file-utils'
import { NwMaterialExtension } from './nw-material/extension'

export async function gltfIO() {
  return new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwMaterialExtension]).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })
}
export async function writeGltf(document: Document, output: string, embed: boolean) {
  const io = await gltfIO()
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
      if (img.mimeType?.startsWith('image/')) {
        ext = img.mimeType.replace('image/', '.')
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

export async function writeGlb(document: Document, output: string) {
  const io = await gltfIO()
  await document.transform(unpartition())
  const binary = await io.writeBinary(document)
  await writeFileBinary(output.replace('.gltf', '.glb'), binary, {
    createDir: true,
  })
}
