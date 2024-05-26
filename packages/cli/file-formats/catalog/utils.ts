export function parseAssetUUID(value: string, options?: { normalize: boolean}) {
  if (!value) {
    return null
  }
  const reg = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  const result = value.match?.(reg)?.[0]
  if (!result) {
    return null
  }
  return options?.normalize ? normalizeUUID(result) : result
}

export function normalizeUUID(value: string) {
  if (!value) {
    return null
  }
  return value.toLowerCase().replace(/-/g, '')
}
