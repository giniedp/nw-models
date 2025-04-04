import { Document, Transform } from '@gltf-transform/core'
import { draco, prune, textureCompress, unpartition } from '@gltf-transform/functions'

import path from 'node:path'
import sharp from 'sharp'
import { Appearance, ModelAnimation } from '../../types'
import { logger } from '../../utils/logger'
import { appendAnimations, appendCameras, appendEntities, appendLights, appendModels } from './from-cgf'
import {
  CgfCameraInput,
  CgfEntityInput,
  CgfLightInput,
  CgfModelInput,
  CgfResolver,
  MtlResolver,
} from './from-cgf/types'
import { nwMaterial } from './nw-material/transform'
import { computeNormals } from './transform/compute-normals'
import { mergeSkins } from './transform/merge-skins'
import { removeLod } from './transform/remove-lod'
import { removeVertexColor } from './transform/remove-vertex-color'
import { stubMissingMaterials } from './transform/stub-missing-materials'
import { toktx } from './transform/toktx'
import { uniqTextures } from './transform/uniq-textures'
import { writeGlb, writeGltf } from './write-gltf'

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
  textureFormat?: 'jpeg' | 'png' | 'webp' | 'avif' | 'ktx'
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

  if (textureFormat === 'ktx') {
    transforms.push(
      toktx({
        matcher: [
          {
            slots: /(normal)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'linear',
              '--assign-primaries', 'none',
              '--format', 'R8G8B8_UNORM',
              '--threads', '2',
            ],
          },
          {
            slots: /(mask)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'linear',
              '--assign-primaries', 'none',
              '--format', 'R8G8B8A8_UNORM',
              '--threads', '2',
            ],
          },
          {
            slots: /(specular)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'uastc',
              '--uastc-quality', '2',
              '--zstd', '18',
              '--assign-oetf', 'srgb',
              '--assign-primaries', 'bt709',
              '--format', 'R8G8B8A8_UNORM',
              '--threads', '2',
            ],
          },
          {
            slots: /(baseColor|diffuse|emissive|occlusion)/,
            // prettier-ignore
            args: [
              '--generate-mipmap',
              '--encode', 'basis-lz',
              '--assign-oetf', 'srgb',
              '--assign-primaries', 'bt709',
              '--format', 'R8G8B8A8_SRGB',
              '--threads', '2',
            ],
          },
        ],
      }),
    )
  } else if (textureFormat) {
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        quality: textureQuality || null,
        slots: /(baseColor|diffuse|emissive|occlusion)/,
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: textureFormat,
        nearLossless: true,
        slots: /(specular)/,
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
