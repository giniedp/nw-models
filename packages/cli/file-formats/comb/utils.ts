import { CombDocument } from './types'

export function getBlendSpaces(doc: CombDocument) {
  return toArray(doc.CombinedBlendSpace?.BlendSpaces?.BlendSpace).map((it) => it.AName)
}

function toArray<T>(item: T | T[]): T[] {
  if (!item) {
    return []
  }
  return Array.isArray(item) ? item : [item]
}
