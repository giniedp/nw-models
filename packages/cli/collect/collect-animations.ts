import path from 'node:path'
import { AnimationAction } from '../file-formats/adb'
import { getBspaceAnimations } from '../file-formats/bspace'
import { CdfAnimationFile } from '../file-formats/cdf'
import { ModelAnimation } from '../types'
import { md5FromFile } from '../utils'

export interface CollectAnimationsOptions {
  animations: CdfAnimationFile[]
  actions: AnimationAction[]
  filter?: (it: ModelAnimation) => boolean
}
export async function collectAnimations(options: CollectAnimationsOptions) {
  const groups: Record<string, ModelAnimation> = {}
  async function collect(file: string, action: string, damageIds: string[]) {
    const md5 = await md5FromFile(file)
    if (!groups[md5]) {
      const animation: ModelAnimation = {
        file: file,
        name: path.basename(file, path.extname(file)).toLowerCase(),
        damageIds: [],
        actions: [],
      }
      groups[md5] = animation
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

  const actions = options.actions
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
            const animation = options.animations.find((it) => it.name.toLowerCase() === blend.animation.toLowerCase())
            if (!animation) {
              continue
            }
            await collect(animation.file, action.name, damageIds)
          }
        }
      }
    }
  }

  let result = Array.from(Object.values(groups))
  if (options.filter) {
    result = result.filter(options.filter)
  }
  for (const item of result) {
    item.meta = { actions: item.actions, damageIds: item.damageIds }
  }
  return result
}
