import { BspceDocument } from './types'

export interface BspaceAnimation {
  animation: string
  params: Record<string, any>
}

export function getBspaceAnimations(doc: BspceDocument) {
  const paramList = toArray(doc.ParaGroup?.Dimensions?.Param)
  return toArray(doc.ParaGroup?.ExampleList?.Example).map((it): BspaceAnimation => {
    const params: Record<string, any> = {}
    for (const key in it) {
      if (key.startsWith('SetPara')) {
        const name = paramList[Number(key.replace('SetPara', ''))].Name
        params[name] = it[key]
      }
    }
    return {
      animation: it.AName,
      params: params,
    }
  })
}

function toArray<T>(item: T | T[]): T[] {
  if (!item) {
    return []
  }
  return Array.isArray(item) ? item : [item]
}
