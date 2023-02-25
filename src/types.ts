export interface TransformContext {
  sourceRoot: string
  targetRoot: string
  update: boolean
}

export interface ModelAsset {
  refId: string
  items: ItemDefinitionMaster[]
  appearance?: Appearance
  model: string
  material: string
  tags: string[]
}

export interface ItemDefinitionMaster {
  AcquisitionNotificationId?: number
  ArmorAppearanceF?: string
  ArmorAppearanceM?: string
  AttributionId?: string
  AudioCreated?: string
  AudioDestroyed?: string
  AudioPickup?: string
  AudioPlace?: string
  AudioUse?: string
  BindOnEquip?: number
  BindOnPickup: number
  CanHavePerks?: number
  CanReplaceGem?: number
  CanRollPerkOnUpgrade?: number
  ConfirmBeforeUse?: number
  ConsumeOnUse?: number
  ContainerGS?: number
  ContainerLevel?: number
  CraftingRecipe?: string
  DeathDropPercentage?: number
  Description?: string
  DestroyOnBreak?: number
  Durability?: number
  DurabilityDmgOnDeath?: number
  EventId?: string
  ForceRarity?: number
  GearScoreOverride?: number
  HeartgemRuneTooltipTitle?: string
  HeartgemTooltipBackgroundImage?: string
  HiResIconPath?: string
  HideFromRewardOpenPopup?: number
  HideInLootTicker?: number
  HousingTags?: string
  IconPath?: string
  IgnoreHWMScaling?: number
  IgnoreNameChanges?: number
  IgnoreParentColumns_DVT?: string
  IngredientBonusPrimary?: number
  IngredientBonusSecondary?: number
  IngredientCategories?: string[]
  IngredientGearScoreBaseBonus?: number
  IngredientGearScoreMaxBonus?: number
  IsMissionItem?: number
  IsRepairable?: number
  IsRequiredItem?: number
  IsSalvageable?: number
  IsUniqueItem?: number
  ItemClass?: string[]
  ItemID: string
  ItemStatsRef?: string
  ItemType?: string
  ItemTypeDisplayName?: string
  MannequinTag?: string
  MaxGearScore?: number
  MaxStackSize?: number
  MinGearScore?: number
  Name?: string
  Nonremovable?: number
  Notes?: string
  ParentItemId_DVT?: string
  Perk1?: string
  Perk2?: string
  Perk3?: string
  Perk4?: string
  Perk5?: string
  PerkBucket1?: string
  PerkBucket2?: string
  PerkBucket3?: string
  PerkBucket4?: string
  PerkBucket5?: string
  PrefabPath?: string
  RepairDustModifier?: number
  RepairRecipe?: string
  RequiredLevel?: number
  SalvageAchievement?: string
  SalvageGameEventID?: string
  SalvageLootTags?: string
  SalvageResources?: number
  SoundTableID?: string
  Tier?: number
  TradingCategory?: string
  TradingFamily?: string
  TradingGroup?: string
  UiItemClass?: string
  UseMagicAffix?: number
  UseMaterialAffix?: number
  UseTypeAffix?: number
  WarboardDepositStat?: string
  WarboardGatherStat?: string
  WeaponAccessory?: string
  WeaponAppearanceOverride?: string
  Weight?: number
}

export interface WeaponAppearanceDefinition {
  WeaponAppearanceID: string
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
  EmissiveIntensity: number
  'Art ID Names'?: string
  'Weapon Material name Info'?: string
  MeshOverride?: string
  RDyeSlotDisabled?: string
  GDyeSlotDisabled?: string
  BDyeSlotDisabled?: string
  ADyeSlotDisabled?: string
  IconCaptureGroup?: string
  IconPath?: string
  HiResIconPath?: string
  EmissiveColor?: string
  SkinOverride2?: string
  Appearance?: string
  FemaleAppearance?: string
  SkinOverride1?: string
  MaterialOverride1?: string
}

export interface ItemAppearanceDefinition {
  ItemID: string
  HairChop: string
  HideHair: number
  HideFacialHair: number
  HideLegs: number
  HideHead?: number
  MaskRColor: string
  MaskROverride: number
  MaskR: number
  MaskRDyeOverride: number
  MaskRDye: number
  MaskGColor: string
  MaskGOverride: number
  MaskG: number
  MaskGDyeOverride: number
  MaskGDye: number
  MaskBColor: string
  MaskBOverride: number
  MaskB: number
  MaskBDyeOverride: number
  MaskBDye: number
  MaskASpecColor: string
  MaskASpec: number
  MaskASpecDye: number
  MaskAGlossShift: number
  MaskAGloss: string
  EmissiveColor: string
  EmissiveIntensity?: number
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
  RDyeSlotDisabled: string
  GDyeSlotDisabled: string
  BDyeSlotDisabled: string
  ADyeSlotDisabled: string
  IconPath: string
  HiResIconPath: string
  IconCaptureGroup: string
}

export type Appearance = WeaponAppearanceDefinition | ItemAppearanceDefinition

export interface StatRow {
  itemId: string
  itemIdNormalized?: string
  itemType: string
  s3Path?: string
  model: string
  size: number
  material: boolean
  tags: string[]
  log: string
}

export interface StatsFile {
  rows: StatRow[]
  infos: {
    label: string
    value: number | string
  }[]
}

export function getAppearanceId(appearance: Appearance) {
  return (
    (appearance as ItemAppearanceDefinition).ItemID || (appearance as WeaponAppearanceDefinition).WeaponAppearanceID
  )
}
