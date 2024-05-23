import path from 'path'
import { getAnimationActions, readAdbFile } from '../file-formats/adb'
import { getBspaceAnimations } from '../file-formats/bspace'
import { CdfAnimationFile } from '../file-formats/cdf'
import { ModelAnimation } from '../types'
import { md5FromFile } from '../utils'

export async function collectAnimations(options: {
  inputDir: string
  adbFile: string
  animations: CdfAnimationFile[]
}) {
  const groups: Record<string, ModelAnimation> = {}
  async function collect(file: string, action: string, damageIds: string[]) {
    const md5 = await md5FromFile(file)
    if (!groups[md5]) {
      groups[md5] = {
        file: file,
        name: path.basename(file, path.extname(file)).toLowerCase(),
        damageIds: [],
        actions: [],
      }
    }
    const group = groups[md5]
    if (!group.actions.includes(action)) {
      group.actions.push(action)
    }
    for (const id of damageIds || []) {
      if (!group.damageIds.includes(id)) {
        group.damageIds.push(id)
      }
    }
  }

  const adb = await readAdbFile(path.resolve(options.inputDir, options.adbFile))
  const actions = getAnimationActions(adb)
  for (const action of actions) {
    for (const frag of action.fragments) {
      const damageIds = frag.damageIds || []
      for (const anim of frag.animations) {
        const animation = options.animations.find((it) => it.name === anim)
        if (!animation) {
          continue
        }
        if (animation.type === 'caf') {
          await collect(animation.file, action.name, damageIds)
          continue
        }

        if (animation.type === 'bspace') {
          const blends = getBspaceAnimations(animation.doc).filter((it) => {
            if ('TravelAngle' in it.params && it.params['TravelAngle'] !== 0) {
              return false
            }
            if ('TravelSlope' in it.params && it.params['TravelSlope'] !== 0) {
              return false
            }
            if ('TurnSpeed' in it.params && it.params['TurnSpeed'] !== 0) {
              return false
            }
            // MoveSpeed
            return true
          })
          for (const blend of blends) {
            const animation = options.animations.find((it) => it.name === blend.animation)
            if (!animation) {
              continue
            }
            await collect(animation.file, action.name, damageIds)
          }
        }
      }
    }
  }

  const result = Array.from(Object.values(groups))

  for (const item of result) {
    item.meta = { actions: item.actions, damageIds: item.damageIds }
  }
  return result
}
