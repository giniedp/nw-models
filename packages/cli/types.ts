import { mat4 } from '@gltf-transform/core'
import { z } from 'zod'

export interface ModelAsset {
  appearance?: Appearance
  animations?: ModelAnimation[]
  meshes: ModelMeshAsset[]
  outFile: string
}

export interface ModelAnimation {
  file: string
  name: string
  damageIds: string[]
  actions: string[]
  meta?: Record<string, any>
}

export interface ModelMeshAsset {
  model: string
  material: string
  ignoreSkin: boolean
  ignoreGeometry: boolean
  transform: mat4
}

export const HousingTableSchema = z.array(
  z.object({
    HouseItemID: z.string(),
    PrefabPath: z.string(),
  }),
)
export type HousingTable = z.infer<typeof HousingTableSchema>
export type Housingitems = HousingTable[number]

export const CostumeChangesSchema = z.array(
  z.object({
    CostumeChangeId: z.string(),
    CostumeChangeMesh: z.string(),
  }),
)
export type CostumeChangesTable = z.infer<typeof CostumeChangesSchema>
export type CostumeChanges = CostumeChangesTable[number]

export const NpcSchema = z.array(
  z.object({
    VariantID: z.string(),
    CharacterDefinition: z.optional(z.string()),
  }),
)
export type NpcTable = z.infer<typeof NpcSchema>
export type Npc = NpcTable[number]

export const MountsTableSchema = z.array(
  z.object({
    MountId: z.string(),
    Mesh: z.optional(z.string()),
    Material: z.optional(z.string()),
    MountType: z.optional(z.string()),
  }),
)
export type MountsTable = z.infer<typeof MountsTableSchema>
export type Mounts = MountsTable[number] & AppearanceMaskDefinition

export interface ItemdefinitionsWeapons {
  WeaponID: string
  MeshOverride?: string
  SkinOverride1?: string
  SkinOverride2?: string
  MaterialOverride1?: string

  AnimDbPath?: string
  Appearance?: string
  FemaleAppearance?: string
}
export interface AppearanceMaskDefinition {
  MaskRColor: string
  MaskROverride: number
  MaskR: number
  MaskGColor: string
  MaskGOverride: number
  MaskG: number
  MaskBColor: string
  MaskBOverride: number
  MaskB: number
  MaskASpecColor: string
  MaskASpec: number
  MaskAGlossShift: number
  MaskAGloss: number
  EmissiveColor: string
  EmissiveIntensity: number

  RDyeSlotDisabled?: string
  GDyeSlotDisabled?: string
  BDyeSlotDisabled?: string
  ADyeSlotDisabled?: string
}

export interface ItemAppearanceDefinition extends AppearanceMaskDefinition {
  ItemID: string
  AppearanceName: string
  HairChop: string
  HideHair: number
  HideFacialHair: number
  HideLegs: number
  HideHead?: number
  MaskRDyeOverride: number
  MaskRDye: number
  MaskGDyeOverride: number
  MaskGDye: number
  MaskBDyeOverride: number
  MaskBDye: number
  MaskASpecDye: number
  RDyeSlotDisabled: string
  GDyeSlotDisabled: string
  BDyeSlotDisabled: string
  ADyeSlotDisabled: string

  Skin1: string
  Material1: string
  IsSkin1?: number
  Mask1: string
  Skin2: string
  Material2: string
  IsSkin2?: number
  Mask2: string
  'Left/On': string
  'Right/Off': string
  ForceShortsleeves?: number
  ShortsleeveChestSkin: string
  ForceHideForearms?: number
  HandsNoForearmsSkin: string
  AttachmentOffsets: string
  LeftHandOnlySkin: string
  RightHandOnlySkin: string
  LeftSleeveOnlyChestSkin: string
  RightSleeveOnlyChestSkin: string
  AppearanceCDF: string
}

export interface WeaponAppearanceDefinition extends AppearanceMaskDefinition {
  WeaponAppearanceID: string
  Appearance?: string
  FemaleAppearance?: string
  MeshOverride?: string
  SkinOverride1?: string
  SkinOverride2?: string
  MaterialOverride1?: string

  RDyeSlotDisabled?: string
  GDyeSlotDisabled?: string
  BDyeSlotDisabled?: string
  ADyeSlotDisabled?: string
}

export interface InstrumentAppearance extends AppearanceMaskDefinition {
  WeaponAppearanceID: string
  Name: string
  MeshOverride: string
  SkinOverride1: string
  MaterialOverride1: string
  SkinOverride2: string
  MaterialOverride2: string
  SkinOverride3: string
  MaterialOverride3: string
  SkinOverride4: string
  MaterialOverride4: string
}

export type Appearance = AppearanceMaskDefinition &
  (WeaponAppearanceDefinition | ItemAppearanceDefinition | InstrumentAppearance | Mounts)

export function getAppearanceId(appearance: Appearance | AppearanceMaskDefinition) {
  return (
    (appearance as ItemAppearanceDefinition).ItemID ||
    (appearance as WeaponAppearanceDefinition).WeaponAppearanceID ||
    (appearance as Mounts).MountId
  )
}
