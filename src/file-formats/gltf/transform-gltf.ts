import { Format, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { Appearance } from '../../types'
import { writeFile } from '../../utils/file-utils'
import { logger } from '../../utils/logger'
import { MaterialObject } from '../mtl'
import { computeNormals } from './transform/compute-normals'
import { fixMaterials } from './transform/fix-materials'
import { removeSkinning } from './transform/remove-skinning'
import { removeVertexColor } from './transform/remove-vertex-color'

export async function transformGltf({
  input,
  material,
  appearance,
  output,
  update,
}: {
  input: string
  material: MaterialObject[]
  appearance: Appearance
  output: string
  update: boolean
}) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const jsonDocument = await io.readAsJSON(input)
  // TODO: make this a transform step
  await fixMaterials({
    material,
    appearance,
    update,
    gltf: jsonDocument.json,
  })

  const document = await io.readJSON(jsonDocument)
  document.setLogger(logger)
  await document.transform(
    removeSkinning(),
    removeVertexColor(),
    computeNormals({
      overwrite: true,
    }),
    prune({}),
  )

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
