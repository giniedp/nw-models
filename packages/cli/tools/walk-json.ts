
export function findInJson<T>(
  input: any,
  predicate: (obj: Object) => boolean | void,
  depthFirst = false,
): T | undefined {
  const match = (it: any) => {
    return typeof it === 'object' && !!predicate(it)
  }
  return depthFirst ? searchDepth(input, match) : searchBreadth(input, match)
}

function searchBreadth(input: any, predicate: (obj: Object) => boolean) {
  const queue = [input]
  while (queue.length) {
    const obj = queue.shift()
    if (!obj) {
      continue
    }
    if (predicate(obj)) {
      return obj
    }
    if (Array.isArray(obj)) {
      queue.push(...obj)
      continue
    }
    if (typeof obj === 'object') {
      for (const key in obj) {
        queue.push(obj[key])
      }
      continue
    }
  }
}

function searchDepth(input: any, predicate: (value: any) => boolean): any {
  if (!input) {
    return
  }

  if (predicate(input)) {
    return input
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const result = searchDepth(item, predicate)
      if (result) {
        return result
      }
    }
    return
  }
  if (typeof input === 'object') {
    for (const key in input) {
      const result = searchDepth(input[key], predicate)
      if (result) {
        return result
      }
    }
  }
}
