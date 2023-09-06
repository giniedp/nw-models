export function isAzEntity(obj: any): obj is AZ__Entity {
  return obj?.__type === 'AZ::Entity'
}
export interface AZ__Entity {
  __type: 'AZ::Entity'
  id: number
  name: string
  isdependencyready: boolean
  isruntimeactive: boolean
  components: Array<any>
}

export function isSliceComponent(obj: any): obj is SliceComponent {
  return obj?.__type === 'SliceComponent'
}
export interface SliceComponent {
  __type: 'SliceComponent'
  baseclass1: AZ__Component
  entities: Array<AZ__Entity>
  prefabs: Array<any>
}

export function isAzComponent(obj: any): obj is AZ__Component {
  return obj?.__type === 'AZ::Component'
}
export interface AZ__Component {
  __type: 'AZ::Component'
  id: number
}

export function isGameTransformComponent(obj: any): obj is GameTransformComponent {
  return obj?.__type === 'GameTransformComponent'
}
export interface GameTransformComponent {
  __type: 'GameTransformComponent'
  m_parentid: number
  m_onnewparentkeepworldtm: boolean
  m_isstatic: boolean
  m_worldtm: Transform
  m_localtm: Transform
}

export function isTransform(obj: any): obj is Transform {
  return obj?.__type === 'Transform'
}
export interface Transform {
  __type: 'Transform'
  __value: {
    'rotation/scale': [number, number, number, number, number, number, number, number, number]
    translation: [number, number, number]
  }
}

export function isHousingItemComponent(obj: any): obj is HousingItemComponent {
  return obj?.__type === 'HousingItemComponent'
}
export interface HousingItemComponent {
  __type: 'HousingItemComponent'
  collisionmeshentityids: number[]
  meshandoutlineentityids: Array<any>
}

export function isLightComponent(obj: any): obj is LightComponent {
  return obj?.__type === 'LightComponent'
}
export interface LightComponent {
  __type: 'LightComponent'
  lightconfiguration: any
}

export function isMeshComponent(obj: any): obj is MeshComponent {
  return obj?.__type === 'MeshComponent'
}
export interface MeshComponent {
  __type: 'MeshComponent'
  lightconfiguration: any
  baseclass1: AZ__Component
  'load mesh on activate': boolean
  'static mesh render node': MeshComponentRenderNode
}

export function isMeshComponentRenderNode(obj: any): obj is MeshComponentRenderNode {
  return obj?.__type === 'MeshComponentRenderNode'
}
export interface MeshComponentRenderNode {
  __type: 'MeshComponentRenderNode'
  visible: boolean
  'static mesh': Asset
  'material override asset': Asset
  'material overcoat asset': Asset
  'render options': MeshRenderOptions
}

export function isSkinnedMeshComponent(obj: any): obj is SkinnedMeshComponent {
  return obj?.__type === 'SkinnedMeshComponent'
}
export interface SkinnedMeshComponent {
  __type: 'SkinnedMeshComponent'
  baseclass1: AZ__Component
  'load mesh on activate': boolean
  'skinned mesh render node': SkinnedMeshComponentRenderNode
}

export function isSkinnedMeshComponentRenderNode(obj: any): obj is SkinnedMeshComponentRenderNode {
  return obj?.__type === 'SkinnedMeshComponentRenderNode'
}
export interface SkinnedMeshComponentRenderNode {
  __type: 'SkinnedMeshComponentRenderNode'
  visible: boolean
  'skinned mesh': Asset
  'material override asset': Asset
  'material overcoat asset': Asset
  'render options': any
}

export function isAsset(obj: any): obj is Asset {
  return obj?.__type === 'Asset'
}
export interface Asset {
  __type: 'Asset'
  guid: string
  subId: string
  type: string
  hint: string
}

export function isMeshRenderOptions(obj: any): obj is MeshRenderOptions {
  return obj?.__type === 'MeshRenderOptions'
}
export interface MeshRenderOptions {
  __type: 'MeshRenderOptions'
  opacity: number
  crossfadetime: number
  maxviewdistance: number
  editorcomputedviewdistance: number
  viewdistancemultiplier: number
  lodratio: number
  castshadows: boolean
  usevisareas: boolean
  rainoccluder: boolean
  affectdynamicwater: boolean
  receivewindbasedonmaterial: boolean
  receivewind: boolean
  windbendscale: number
  acceptdecals: boolean
  acceptsnow: boolean
  acceptsand: boolean
  acceptsilhouette: boolean
  affectnavmesh: boolean
  visibilityoccluder: boolean
  dynamicmesh: boolean
  alwaysrender: boolean
  lod_minscreenpct: number[]
  sorttype: number
  shouldmerge: boolean
  forcemerge: boolean
  fadeenabled: boolean
  primaryinhierarchy: boolean
  usemanualviewdistance: boolean
}
