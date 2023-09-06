import { uniqBy } from 'lodash'
import path from 'path'
import { getMaterialTextures, loadMtlFile } from '../file-formats/mtl'
import { ModelAsset, ModelMeshAsset } from '../types'
import { CaseInsensitiveSet } from '../utils/caseinsensitive-map'
import { replaceExtname } from '../utils/file-utils'

export async function selectTextures({ sourceRoot, assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    for (const mesh of asset.meshes) {
      const mtl = await loadMtlFile(path.join(sourceRoot, mesh.material))
      for (const it of mtl) {
        const textures = getMaterialTextures(it) || []
        for (const texture of textures) {
          result.add(replaceExtname(texture.File, '.dds'))
        }
      }
    }
  }
  return Array.from(result)
}

export async function selectModels({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  function identity(asset: ModelMeshAsset) {
    if (asset.hash) {
      return asset.hash
    }
    return `${asset.model}:${asset.material}`.toLowerCase()
  }
  const meshes = assets.map((asset) => asset.meshes).flat(1)
  return uniqBy(meshes, identity).map((it) => {
    return {
      ...it,
    }
  })
}

export async function selectMaterials({ assets }: { sourceRoot: string; assets: ModelAsset[] }) {
  const result = new CaseInsensitiveSet<string>()
  for (const asset of assets) {
    for (const mesh of asset.meshes) {
      result.add(mesh.material)
    }
  }
  return Array.from(result)
}
