import { mat4 } from '@gltf-transform/core'
import { CgfFile } from '../../../file-formats/cgf'
import { MtlObject } from '../../../file-formats/mtl'

export interface CgfModelInput {
  model: string
  material: string
  ignoreGeometry: boolean
  ignoreSkin: boolean
  transform: mat4
}

export type CgfResolver = (file: string) => Promise<CgfFile>
export type MtlResolver = (file: string) => Promise<MtlObject[]>
