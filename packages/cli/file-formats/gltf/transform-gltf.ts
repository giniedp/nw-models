import { Document, Format, NodeIO, Transform, mat4 } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco, prune, textureCompress, unpartition } from '@gltf-transform/functions'

import draco3d from 'draco3dgltf'
import * as path from 'path'
import sharp from 'sharp'
import { attachAnimations } from '../../file-formats/cgf/converter/convert-animations'
import { Appearance } from '../../types'
import { writeFile, writeFileBinary } from '../../utils/file-utils'
import { logger } from '../../utils/logger'
import { MtlObject } from '../mtl'
import { nwAppearance } from './extensions/nw-appearance'
import { NwAppearanceExtension } from './extensions/nw-appearance-extension'
import { addMissingMaterial } from './transform/add-missing-material'
import { computeNormals } from './transform/compute-normals'
import { mergeScenes } from './transform/merge-scenes'
import { removeLod } from './transform/remove-lod'
import { removeSkinning } from './transform/remove-skinning'
import { removeVertexColor } from './transform/remove-vertex-color'
import { transformRoot } from './transform/transform-root'
import { uniqTextures } from './transform/uniq-textures'
import { appendCAF, appendCGF } from 'file-formats/cgf/converter/gltf'
//import { toktx } from './transform/toktx';

export async function transformGltf({
  meshes,
  appearance,
  animations,
  output,
  withDraco,
  withWebp,
  withKtx,
}: {
  meshes: Array<{
    model: string
    material: MtlObject[]
    transform?: number[]
  }>
  animations?: string[]
  appearance: Appearance
  output: string
  withDraco?: boolean
  withWebp?: boolean
  withKtx?: boolean
}) {
  const io = new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwAppearanceExtension]).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
    'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
  })

  const doc = new Document()
  doc.createBuffer('buffer')

  const scene = doc.createScene()
  doc.getRoot().setDefaultScene(scene)

  // let document: Document
  // for (const mesh of meshes) {
  //   const doc = await transformFile({
  //     input: mesh.model,
  //     material: mesh.material,
  //     appearance: appearance,
  //     matrix: mesh.transform,
  //     hasAnimations: !!animations?.length,
  //   }).catch((err): Document => {
  //     logger.warn(`mesh ignored: `, err)
  //     return null
  //   })
  //   if (!doc) {
  //     continue
  //   }
  //   document = mergeDocuments(document, doc)
  // }

  // if (!document) {
  //   throw new Error('no sub models found')
  // }

  const transforms: Transform[] = []

  meshes.forEach((mesh, i) => {
    transforms.push(appendCGF({
      file: mesh.model,
      material: mesh.material,
      ignoreBones: i > 0
    }))
  })

  if (animations?.length) {
    transforms.push(appendCAF({ animations }))
  }
  if (meshes.length > 1) {
    transforms.push(mergeScenes())
  }

  transforms.push(unpartition())
  if (withDraco) {
    transforms.push(draco({}))
  }

  transforms.push(uniqTextures(), prune({}))

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
    // const slotsUASTC = /(baseColor|diffuse|specularGlossiness|emissive|occlusion)/;
    // transforms.push(
    //   toktx({ mode: Mode.UASTC, slots: slotsUASTC, level: 4, rdo: 4, zstd: 18 }),
    //   toktx({ mode: Mode.ETC1S, quality: 255 }),
    // );
  }

  await doc.transform(...transforms)

  if (path.extname(output) === '.glb') {
    await writeGlb(io, output, doc)
  } else {
    await writeGltf(io, output, doc)
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
  matrix,
  appearance,
  hasAnimations,
}: {
  input: string
  material: MtlObject[]
  matrix?: number[]
  appearance: Appearance
  hasAnimations: boolean
}) {
  const io = new NodeIO().registerExtensions([...ALL_EXTENSIONS, NwAppearanceExtension])
  const jsonDocument = await io.readAsJSON(input)
  const document = await io.readJSON(jsonDocument)
  document.setLogger(logger)

  const transform: Transform[] = [
    hasAnimations ? null : removeSkinning(),
    // vertex color channels are somtetimes white but sometimes black
    // default shader implementation multiplies vertex color with base color
    // which then sometimes results in black color, thus removing vertex channel here
    removeVertexColor(),
    // normal channels are present though all zeros
    // thus computing normals here
    computeNormals({
      overwrite: true,
    }),
    transformRoot({ matrix: matrix as mat4 }),
    removeLod(),
    prune({}),
    nwAppearance({
      appearance,
      materials: material,
      bake: true,
    }),
    addMissingMaterial(),
    prune({}),
  ].filter((it) => !!it)

  await document.transform(...transform)

  return document
}

function mergeDocuments(target: Document, other: Document) {
  if (!target) {
    return other
  }

  const targetHasSkin = target.getRoot().listSkins().length > 0
  const otherHasSkin = other.getRoot().listSkins().length > 0
  const result = target.merge(other)
  // const defaultScene = result.getRoot().getDefaultScene()
  // for (const scene of result.getRoot().listScenes()) {
  //   if (scene === defaultScene) {
  //     continue
  //   }
  //   for (const child of scene.listChildren()) {
  //     child.detach()
  //     defaultScene.addChild(child)
  //   }
  //   scene.detach()
  // }

  // if (targetHasSkin && otherHasSkin) {
  //   const mainSkin = result.getRoot().listSkins()[0]
  //   for (const node of result.getRoot().listNodes()) {
  //     if (node.getSkin() && node.getSkin() !== mainSkin) {
  //       node.setSkin(mainSkin)
  //     }
  //   }
  //   for (const skin of result.getRoot().listSkins()) {
  //     if (skin === mainSkin) {
  //       continue
  //     }
  //     for (const joint of skin.listJoints()) {
  //       skin.removeJoint(joint)
  //       joint.detach()
  //     }
  //     skin.detach()
  //   }
  // }

  // console.log('SKINS', result.getRoot().listSkins().length)
  return result
}
