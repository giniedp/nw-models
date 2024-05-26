
export interface AnimDBDocument {
  AnimDB: AnimDBNode
}

export interface AnimDBNode {
  FragmentList: FragmentListNode
  SubADBs: SubADBsListNode
}

export interface SubADBsListNode {
  SubADB: SubADBNode[]
}

export interface SubADBNode {
  Tags: string
  File: FragmentListNode
}

export interface FragmentListNode {
  [key: string]: { Fragment: FragmentNode[]  }
}

export interface FragmentNode {
  BlendOutDuration: number
  Tags: string
  AnimLayer: AnimLayerNode[]
  ProcLayer: ProcLayerNode[]
}

export interface AnimLayerNode {
  Blend: BlendNode[]
  Animation: AnimationNode[]
}

export interface AnimationNode {
  name: string
  weight: number
}

export interface ProcLayerNode {
  Blend: BlendNode[]
  Procedural: ProceduralNode[]
}

export interface BlendNode {
  ExitTime: number
  StartTime: number
  Duration: number
  CurveType: number
}
export interface ProceduralNode {
  type: string
  contextType: string
  ProceduralParams: ProceduralParams
}

export interface ProceduralParams {
  DamageTableRow: {
    value: string
  }
}
export interface FragmentBlendList {}
