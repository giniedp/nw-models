export type MaybeArray<T> = T | T[]

export interface CombDocument {
  CombinedBlendSpace: CombinedBlendSpace
}

export interface CombinedBlendSpace {
  Dimensions: {
    Pram: MaybeArray<Param>
  }
  AdditionalExtraction: {
    Pram: MaybeArray<Param>
  }
  BlendSpaces: {
    BlendSpace: MaybeArray<BlendSpace>
  }
  // MotionCombination
  // JointList
}

export interface Param {
  Name: string
}

export interface BlendSpace {
  AName: string
}
