export function toArray<T>(item: T | T[]): T[] {
  if (Array.isArray(item)) {
    return item
  }
  if (item != null) {
    return [item]
  }
  return []
}
