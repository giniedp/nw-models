import type { Document, Transform, vec3 } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'

const NAME = 'compute-normals'

export interface NormalsOptions {
  overwrite?: boolean
}

const NORMALS_DEFAULTS: Required<NormalsOptions> = {
  overwrite: false,
}

export function computeNormals(_options: NormalsOptions = NORMALS_DEFAULTS): Transform {
  const options = { ...NORMALS_DEFAULTS, ..._options } as Required<NormalsOptions>

  return createTransform(NAME, async (document: Document): Promise<void> => {
    const logger = document.getLogger()
    let modified = 0

    let v1Index = 0
    let v2Index = 0
    let v3Index = 0
    const v1 = [0, 0, 0] as vec3
    const v2 = [0, 0, 0] as vec3
    const v3 = [0, 0, 0] as vec3
    const p1 = [0, 0, 0] as vec3
    const p2 = [0, 0, 0] as vec3
    const faceNormal = [0, 0, 0] as vec3
    const tmpNormal = [0, 0, 0] as vec3

    for (const mesh of document.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const indices = prim.getIndices()
        const position = prim.getAttribute('POSITION')
        let normal = prim.getAttribute('NORMAL')

        if (options.overwrite && normal) {
          normal.dispose()
        } else if (normal) {
          logger.debug(`${NAME}: Skipping primitive: NORMAL found.`)
          continue
        }

        const faceCount = indices.getCount() / 3
        const data = new Float32Array(position.getCount() * 3)
        normal = document.createAccessor().setArray(data).setType('VEC3')

        for (let i = 0; i < faceCount; i++) {
          v1Index = indices.getScalar(i * 3)
          v2Index = indices.getScalar(i * 3 + 1)
          v3Index = indices.getScalar(i * 3 + 2)

          position.getElement(v1Index, v1)
          position.getElement(v2Index, v2)
          position.getElement(v3Index, v3)

          p1[0] = v2[0] - v1[0]
          p1[1] = v2[1] - v1[1]
          p1[2] = v2[2] - v1[2]
          p2[0] = v3[0] - v1[0]
          p2[1] = v3[1] - v1[1]
          p2[2] = v3[2] - v1[2]

          faceNormal[0] = p1[1] * p2[2] - p1[2] * p2[1]
          faceNormal[1] = p1[2] * p2[0] - p1[0] * p2[2]
          faceNormal[2] = p1[0] * p2[1] - p1[1] * p2[0]
          normalize(faceNormal)

          data[v1Index * 3 + 0] += faceNormal[0]
          data[v1Index * 3 + 1] += faceNormal[1]
          data[v1Index * 3 + 2] += faceNormal[2]

          data[v2Index * 3 + 0] += faceNormal[0]
          data[v2Index * 3 + 1] += faceNormal[1]
          data[v2Index * 3 + 2] += faceNormal[2]

          data[v3Index * 3 + 0] += faceNormal[0]
          data[v3Index * 3 + 1] += faceNormal[1]
          data[v3Index * 3 + 2] += faceNormal[2]
        }

        for (let i = 0; i < data.length; i += 3) {
          tmpNormal[0] = data[i + 0]
          tmpNormal[1] = data[i + 1]
          tmpNormal[2] = data[i + 2]
          normalize(tmpNormal)
          data[i + 0] = tmpNormal[0]
          data[i + 1] = tmpNormal[1]
          data[i + 2] = tmpNormal[2]
        }

        prim.setAttribute('NORMAL', normal)
        modified++
      }
    }

    logger.debug(`${NAME}: Complete. Modified ${modified} primitives.`)
  })
}

function normalize(normal: vec3) {
  let length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
  length = length === 0 ? 1.0 : length
  normal[0] /= length
  normal[1] /= length
  normal[2] /= length
}
