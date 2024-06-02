import { mat4 } from '@gltf-transform/core'
import { CgfFile } from '../../../file-formats/cgf'
import { MtlObject } from '../../../file-formats/mtl'

export interface CgfModelInput {
  model: string
  material: string
  ignoreGeometry?: boolean
  ignoreSkin?: boolean
  transform: mat4
}

export interface CgfLightInput {
  name?: string
  type: number
  color: number[]
  intensity: number
  innerConeAngle: number
  outerConeAngle: number
  range: number
  transform: mat4
}

export interface CgfCameraInput {
  name?: string
  transform: mat4
  zNear: number
  zFar: number
  fov: number
}

export interface CgfEntityInput {
  name?: string
  transform: mat4
  meta?: Record<string, any>
}

export type CgfResolver = (file: string) => Promise<CgfFile>
export type MtlResolver = (file: string) => Promise<MtlObject[]>
