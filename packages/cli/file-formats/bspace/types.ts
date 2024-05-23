export type MaybeArray<T> = T | T[]

export interface BspceDocument {
  ParaGroup: ParaGroup
}

export interface ParaGroup {
  Dimensions: Dimensions
  ExampleList: ExampleList
  // Blendable: Blendable
  // VGrid: VGrid
}

export interface Dimensions {
  Param: MaybeArray<Param>
}

export interface Param {
  Name: string
}

export interface ExampleList {
  Example: MaybeArray<Example>
}

export interface Example {
  AName: string
  PlaybackScale: string
  [key: string]: any
}

