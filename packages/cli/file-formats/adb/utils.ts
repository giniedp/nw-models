import { uniq } from 'lodash'
import { AnimDBDocument } from './types'

export interface AnimationAction {
  name: string
  fragments: AnimationActionFragment[]
}

export interface AnimationActionFragment {
  tags: string
  animations: string[]
  damageIds: string[]
}

export function getAnimationActions(doc: AnimDBDocument) {
  const actions: Array<AnimationAction> = []
  for (const actionName in doc.AnimDB.FragmentList || {}) {
    const fragments: AnimationActionFragment[] = []
    for (const fragment of doc.AnimDB.FragmentList[actionName].Fragment || []) {
      const animations: string[] = []
      const damageIds: string[] = []
      for (const animLayer of fragment.AnimLayer || []) {
        for (const anim of animLayer.Animation || []) {
          if (anim.name) {
            animations.push(anim.name)
          }
        }
      }
      for (const procLayer of fragment.ProcLayer || []) {
        for (const proc of procLayer.Procedural || []) {
          const dmgTable = proc.ProceduralParams?.DamageTableRow?.value
          if (dmgTable) {
            damageIds.push(dmgTable)
          }
        }
      }
      fragments.push({
        tags: fragment.Tags,
        animations: uniq(animations),
        damageIds: uniq(damageIds),
      })
    }

    actions.push({
      name: actionName,
      fragments: fragments,
    })
  }
  return actions
}
