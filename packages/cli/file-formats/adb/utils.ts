import { uniq } from 'lodash'
import { AnimDBDocument, AnimLayerNode, FragmentNode } from './types'

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


export function adbActionsForTags(doc: AnimDBDocument, tags: string[] = []) {
  const actions: Array<AnimationAction> = []
  for (const { action, fragments } of eachAdbAction(doc)) {
    const actionFragments: AnimationActionFragment[] = []
    const list = adbFragmentsSortedByBestMatch(fragments, tags)
    for (const match of list) {
      if (!match.doesMatch || !match.fragment.AnimLayer?.length) {
        continue
      }
      const layers = match.fragment.AnimLayer.map(adbAnimationsForLayer).filter((it) => it.length)
      if (!layers.length) {
        continue
      }
      actionFragments.push({
        tags: match.fragment.Tags,
        animations: layers[0], // assume first layer holds the most important animations
        damageIds: getDamageIdsForFragment(match.fragment),
      })
    }
    if (actionFragments.length) {
      actions.push({
        name: action,
        fragments: actionFragments,
      })
    }
  }
  return actions
}

export function adbAnimationsForLayer(layer: AnimLayerNode) {
  const animations: string[] = []
  for (const anim of layer.Animation || []) {
    if (anim.name && anim.weight !== 0) {
      animations.push(anim.name)
    }
  }
  return animations
}

export function *eachAdbAction(doc: AnimDBDocument) {
  const list = doc.AnimDB.FragmentList || {}
  for (const action in list || {}) {
    yield {
      action,
      fragments: list[action].Fragment || []
    }
  }
}

export function adbFragmentsSortedByBestMatch(fragments: FragmentNode[], tags: string[]) {
  const results: ReturnType<typeof adbFragmentTestWithTags>[] = []
  for (const fragment of fragments) {
    results.push(adbFragmentTestWithTags(fragment, tags))
  }
  results.sort((a, b) => {
    if (a.doesMatch && !b.doesMatch) {
      return -1
    }
    if (!a.doesMatch && b.doesMatch) {
      return 1
    }
    if (a.matchingTags.length > b.matchingTags.length) {
      return -1
    }
    if (a.matchingTags.length < b.matchingTags.length) {
      return 1
    }
    if (a.fragmentTags.length < b.fragmentTags.length) {
      return -1
    }
    if (a.fragmentTags.length > b.fragmentTags.length) {
      return 1
    }
    return 0
  })
  return results
}

export function adbFragmentTestWithTags(fragment: FragmentNode, tags: string[]) {
  const fTags = (fragment.Tags || '').split('+').filter((it) => it)
  const matchingTags: string[] = []
  if (tags && tags.length) {
    for (const tag of tags) {
      if (fTags.some((it) => it.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
        matchingTags.push(tag)
      }
    }
  }

  return {
    fragment,
    fragmentTags: fTags,
    matchingTags: matchingTags,
    doesMatch: matchingTags.length === (tags?.length || 0),
  }
}

export function getDamageIdsForFragment(fragment: FragmentNode) {
  const result: string[] = []
  if (!fragment?.ProcLayer?.length) {
    return result
  }

  for (const procLayer of fragment.ProcLayer) {
    if (!procLayer.Procedural?.length) {
      continue
    }
    for (const proc of procLayer.Procedural) {
      const dmgTable = proc.ProceduralParams?.DamageTableRow?.value
      if (dmgTable) {
        result.push(dmgTable)
      }
    }
  }
  return result
}
