import { mat4 } from '@gltf-transform/core'
import path from 'path'
import { cryToGltfMat4, mat4FromQuaternion, mat4Identity } from '../gltf/utils/math'
import { Asset, GameTransformComponent } from './types'

export function getTransformMatrix(component: GameTransformComponent): mat4 {
  let transform = mat4Identity()
  const world = component?.m_worldtm?.__value as any
  if (world?.['rotation/scale']?.length) {
    // prettier-ignore
    const [
      x1, y1, z1,
      x2, y2, z2,
      x3, y3, z3
    ] = world['rotation/scale']
    const [x, y, z] = world.translation
    transform = cryToGltfMat4(
      // prettier-ignore
      [
        x1, y1, z1, 0,
        x2, y2, z2, 0,
        x3, y3, z3, 0,
         x,  y,  z, 1
      ],
    )
  }
  return transform
}

export function getTransformFromCapital(capital: {
  worldPosition?: {
    x?: number
    y?: number
    z?: number
  }
  rotation?: {
    x?: number
    y?: number
    z?: number
    w?: number
  }
  scale?: number
}) {
  const transform = mat4FromQuaternion({
    x: capital.rotation?.x ?? 0,
    y: capital.rotation?.y ?? 0,
    z: capital.rotation?.z ?? 0,
    w: capital.rotation?.w ?? 1,
  })
  if (capital.scale) {
    const s = capital.scale
    transform[0] *= s
    transform[1] *= s
    transform[2] *= s
    transform[4] *= s
    transform[5] *= s
    transform[6] *= s
    transform[8] *= s
    transform[9] *= s
    transform[10] *= s
  }
  transform[12] = capital.worldPosition?.x ?? 0
  transform[13] = capital.worldPosition?.y ?? 0
  transform[14] = capital.worldPosition?.z ?? 0

  return cryToGltfMat4(transform)
}

const unknownFileExtensions = ['.rnr']
export function getAssetPath(catalog: Record<string, string>, asset: Asset) {
  if (!asset) {
    return null
  }
  const uuid = normalizeUUID(asset.guid)
  if (uuid && catalog[uuid]) {
    const result = catalog[uuid]
    if (!unknownFileExtensions.includes(path.extname(result))) {
      return result
    }
  }
  return asset.hint
}

export function getCapitalPath(
  catalog: Record<string, string>,
  capital: { sliceName?: string; sliceAssetId?: string },
) {
  if (!capital) {
    return null
  }

  // const uuidReg = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  // if (capital.sliceAssetId) {
  //   const uuid = normalizeUUID(capital.sliceAssetId.match(uuidReg)[0])
  //   if (uuid && catalog[uuid]) {
  //     const result = catalog[uuid]
  //     if (!unknownFileExtensions.includes(path.extname(result))) {
  //       return result
  //     }
  //   }
  // }

  if (capital.sliceName) {
    if (!path.extname(capital.sliceName)) {
      return capital.sliceName + '.dynamicslice'
    }
    return capital.sliceName
  }
  return null
}

function normalizeUUID(uuid: string) {
  return uuid ? uuid.replace(/-/g, '').toLowerCase() : null
}
