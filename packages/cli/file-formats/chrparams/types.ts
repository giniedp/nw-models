export type ChrParamsDocument = {
  Params: ChrParams
}

export type ChrParams = {
  Model: {
    File: string
  }
  AnimationList: {
    Animation: Animation | Array<Animation>
  }
  BBoxIncludeList: {
    Joint: Joint | Array<Joint>
  }
}


export interface Animation {
  name: string
  path: string
}

export interface Joint {
  name: string
}
