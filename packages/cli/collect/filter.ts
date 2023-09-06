import { ModelAsset } from '../types'

export function matchesAnyInList<T>(idProp: keyof T, list: string[]) {
  if (!list) {
    return (item: T) => true
  }
  return (item: T) => {
    const value = String(item[idProp]).toLowerCase()
    return list.some((it) => value.includes(it))
  }
}

export function isInListFilter<T>(prop: keyof T, list: string[]) {
  if (!list) {
    return () => true
  }
  return (item: T) => {
    const value = String(item[prop])
    return list.some((it) => eqIgnoreCase(it, value))
  }
}

export function filterAssetsBySkinName(skins: string[], assets: ModelAsset[]) {
  if (!skins?.length) {
    return assets
  }
  return assets.filter((it) => {
    return it.meshes.some(({ model }) => {
      const skin = model.toLowerCase()
      return skins.some((it) => skin.includes(it))
    })
  })
}

export function filterAssetsModelMaterialHash(hashes: string[], assets: ModelAsset[]) {
  if (!hashes?.length) {
    return assets
  }
  return assets.filter((it) => {
    return it.meshes.some(({ hash }) => {
      hash = hash.toLowerCase()
      return hashes.some((it) => it === hash)
    })
  })
}

function eqIgnoreCase(a: string, b: string) {
  return a?.toLowerCase() === b?.toLowerCase()
}
