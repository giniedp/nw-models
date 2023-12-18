export interface TransformContext {
  sourceRoot: string
  transitRoot: string
  targetRoot: string
  update: boolean
}

export interface ModelMeshAsset {
  model: string
  material: string
  hash?: string
  transform?: number[]
  lights?: unknown[]
}

export interface ModelAsset {
  appearance?: Appearance
  meshes: ModelMeshAsset[]
  outDir: string
  outFile: string
}
export interface Housingitems {
  AttributionId?: string
  AudioCreated: string
  AudioPickup: string
  AudioPlace: string
  AudioUse: string
  BindOnPickup: boolean
  ColorFamilies?: string
  ConfirmBeforeUse: boolean
  ConsumeOnUse: boolean
  CraftingRecipe?: string
  'DEV-FurnitureSet'?: string
  DeathDropPercentage: number
  Description: string
  ExcludeFromGame: number
  ForceRarity: number
  HiResIconPath?: string
  HouseItemID: string
  HousingStatusEffect?: string
  'HousingTag1 Placed'?: string
  'HousingTag2 Points'?: string
  'HousingTag3 Limiter'?: string
  'HousingTag5 Buffs'?: string
  HousingTags?: string
  'HowToOptain (Primarily)'?: string
  IconPath?: string
  InteractionAnimationID?: string
  IsEntitlement?: string
  IsRepairable: boolean
  IsSalvageable: boolean
  ItemRarity?: string
  ItemType: string
  ItemTypeDisplayName?: string
  MaxPotentialPoints: number
  MaxStackSize: number
  Name: string
  Nonremovable: boolean
  Notes?: string
  PlacementGridDisplaySize?: string
  PointModifier: number
  PrefabPath: string
  'Primary Color'?: string
  RankingPoints: number
  RankingPointsDuplicateLimit: number
  RankingPointsNegativeLimit: number
  RepairDustModifier: number
  RepairRecipe?: string
  SalvageGameEventID?: string
  SalvageRecipe?: string
  SalvageResources: boolean
  StorageBonus: number
  Tier: number
  TradingCategory?: string
  TradingFamily?: string
  TradingGroup?: string
  UIHousingCategory?: string
  UiItemClass: string
  Weight: number
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
  BindOnPickup?: number | string
  CanHavePerks?: number
  CanReplaceGem?: number
  CanRollPerkOnUpgrade?: number
  ConfirmBeforeUse: number
  ConfirmDestroy?: number
  ConsumeOnUse: number
  ContainerGS?: number
  ContainerLevel?: number
  CraftingRecipe?: string
  DeathDropPercentage: number
  Description?: string
  DestroyOnBreak: number
  Durability?: number
  DurabilityDmgOnDeath?: number
  EventId?: string
  ExceedMinIndex?: number
  ExclusivelyForWarCampTier?: number
  ForceRarity?: number
  GearScoreOverride?: number
  GrantsHWMBump?: number
  HeartgemRuneTooltipTitle?: string
  HeartgemTooltipBackgroundImage?: string
  HiResIconPath?: string
  HideFromRewardOpenPopup?: number
  HideInLootTicker?: number
  HousingTags?: string
  IconPath: null | string
  IgnoreHWMScaling?: number | string
  IgnoreNameChanges?: number
  IgnoreParentColumns_DVT?: string
  IngredientBonusPrimary?: number
  IngredientBonusSecondary?: number
  IngredientCategories?: string[]
  IngredientGearScoreBaseBonus?: number
  IngredientGearScoreMaxBonus?: number
  IsMissionItem?: number
  IsRepairable: number
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
  MaxStackSize: number
  MinGearScore?: number
  Name?: string
  Nonremovable?: number
  Notes?: string
  ObtainableReleaseVersion?: string
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
  SalvageGuaranteedPerkCount?: number
  SalvageLootTags?: string
  SalvageResources?: number
  SoundTableID?: string
  Tier: number
  TradingCategory?: string
  TradingFamily?: string
  TradingGroup?: string
  UiItemClass?: string
  UseMagicAffix: number
  UseMaterialAffix: number
  UseTypeAffix: number
  WarboardDepositStat?: string
  WarboardGatherStat?: string
  WeaponAccessory?: string
  WeaponAppearanceOverride?: string
  Weight: number
}
export interface ItemdefinitionsWeapons {
  ABABleed: number
  ABACurse: number
  ABADisease: number
  ABAFrostbite: number
  ABAPoison: number
  AmmoMesh?: string
  AmmoType?: string
  AnimDbPath?: string
  Appearance?: string
  ArmorRatingScaleFactor: number
  AttachedSpellData?: string
  AttackGameEventID?: string
  AudioPickup?: string
  AudioPlace?: string
  AutoReloadAmmoSeconds: number
  BLAArcane: number
  BLACorruption: number
  BLAFire: number
  BLAIce: number
  BLALightning: number
  BLANature: number
  BLASiege: number
  BLASlash: number
  BLAStandard?: string
  BLAStrike: number
  BLAThrust: number
  BaseAccuracy: number
  BaseDamage: number
  BaseStaggerDamage: number
  BlockStability: number
  BlockStaminaDamage: number
  CanBlockRanged: boolean
  CritChance: number
  CritDamageMultiplier: number
  CritStaggerDamageMultiplier: number
  'DEV Prio': number
  DamageStatMultiplier?: string
  DamageTableRow?: string
  DeflectionRating: number
  ElementalArmorSetScaleFactor: number
  EquipType?: string
  FemaleAppearance?: string
  FireJoint?: string
  GatheringEfficiency: number
  GatheringMultiplier: number
  GatheringTypes?: string
  HideMainWeaponMeshWhileSheathed: boolean
  IconPath?: string
  IsShieldCompatible: boolean
  ManaCostId?: string
  MannequinTag?: string
  MaterialOverride1?: string
  MaxGatherEFF: number
  MaxLoadedAmmo: number
  MaxStackSize: number
  MeshOverride?: string
  MinGatherEFF: number
  OffHandMannequinTag?: string
  PhysicalArmorSetScaleFactor: number
  'Primary Hand'?: string
  PrimaryUse?: string
  RangedAttackProfile?: string
  RangedBlockHealthDamageScaling: number
  RangedBlockStaminaDamageScaling: number
  RequiredDexterity: number
  RequiredFocus: number
  RequiredIntelligence: number
  RequiredStrength: number
  ReticleName?: string
  ReticleRayCastDistance: number
  ReticleTargetName?: string
  ScalingDexterity: number
  ScalingFocus: number
  ScalingIntelligence: number
  ScalingStrength: number
  SkinOverride1?: string
  SkinOverride2?: string
  SoundTableID?: string
  TierNumber: number
  TooltipAlternateAttackData?: string
  TooltipPrimaryAttackData?: string
  Weaknesses?: string
  WeaponEffectId?: string
  WeaponID: string
  WeaponMasteryCategoryId?: string
  WeightOverride: number
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

export interface CostumeChanges {
  CostumeChangeId: string
  CostumeChangeMesh: string
}

export interface Npc {
  NPCId: string
  VariantID: string
  CharacterDefinition: string
}

export interface Mounts extends AppearanceMaskDefinition {
  MountId: string
  Mesh: string
  Material: string
}

export interface ItemAppearanceDefinition extends AppearanceMaskDefinition {
  ItemID: string
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
