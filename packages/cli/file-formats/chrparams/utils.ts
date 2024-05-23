import path from 'path'
import { ChrParams } from './types'

export function getChrParamsAnimationGlobs(params: ChrParams, options: { inputDir: string }) {
  const result: string[] = []
  let filePath: string = null
  for (const animation of toArray(params.AnimationList.Animation)) {
    if (animation.name === '#filepath') {
      filePath = animation.path
      continue
    }
    if (!filePath) {
      continue
    }
    const extname = path.extname(animation.path).toLowerCase()
    if (extname === '.caf' || extname === '.bspace' || extname === '.comb') {
      let file = animation.path
      if (file.startsWith('*/')) {
        file = '*' + file
      }
      result.push(path.join(options.inputDir, filePath, file))
    }
  }
  return result
}

function toArray<T>(it: T | T[]) {
  return Array.isArray(it) ? it : [it]
}
