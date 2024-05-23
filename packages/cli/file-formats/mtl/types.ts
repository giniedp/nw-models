export interface MtlDocument {
  Material: MtlObject
}

export enum MtlFlags {
  WIRE = 0x0001, // Use wire frame rendering for this material.
  TWO_SIDED = 0x0002, // Use 2 Sided rendering for this material.
  ADDITIVE = 0x0004, // Use Additive blending for this material.
  DETAIL_DECAL = 0x0008, // UNUSED RESERVED FOR LEGACY REASONS
  LIGHTING = 0x0010, // Should lighting be applied on this material.
  NOSHADOW = 0x0020, // Material do not cast shadows.
  ALWAYS_USED = 0x0040, // When set forces material to be export even if not explicitly used.
  PURE_CHILD = 0x0080, // Not shared sub material, sub material unique to his parent multi material.
  MULTI_SUBMTL = 0x0100, // This material is a multi sub material.
  NOPHYSICALIZE = 0x0200, // Should not physicalize this material.
  NODRAW = 0x0400, // Do not render this material.
  NOPREVIEW = 0x0800, // Cannot preview the material.
  NOTINSTANCED = 0x1000, // Do not instantiate this material.
  COLLISION_PROXY = 0x2000, // This material is the collision proxy.
  SCATTER = 0x4000, // Use scattering for this material
  REQUIRE_FORWARD_RENDERING = 0x8000, // This material has to be rendered in forward rendering passes (alpha/additive blended)
  NON_REMOVABLE = 0x10000, // Material with this flag once created are never removed from material manager (Used for decal materials, this flag should not be saved).
  HIDEONBREAK = 0x20000, // Non-physicalized subsets with such materials will be removed after the object breaks
  UIMATERIAL = 0x40000, // Used for UI in Editor. Don't need show it DB.
  MTL_64BIT_SHADERGENMASK = 0x80000, // ShaderGen mask is remapped
  RAYCAST_PROXY = 0x100000,
  REQUIRE_NEAREST_CUBEMAP = 0x200000, // materials with alpha blending requires special processing for shadows
  CONSOLE_MAT = 0x400000,
  DELETE_PENDING = 0x800000, // Internal use only
  BLEND_TERRAIN = 0x1000000,
  IS_TERRAIN = 0x2000000, // indication to the loader - Terrain type
  IS_SKY = 0x4000000, // indication to the loader - Sky type
  FOG_VOLUME_SHADING_QUALITY_HIGH = 0x8000000, // high vertex shading quality behaves more accurately with fog volumes.
}

export interface MtlObject {
  AlphaTest?: number
  CloakAmount?: number
  DccMaterialHash?: number
  DetailDecal?: MtlDetailDecal
  Diffuse?: MtlColor
  Emissive?: MtlColor
  Emittance?: MtlColor
  GenMask?: number | string
  LayerAct?: number
  MaterialLayers?: MtlLayers
  MaterialPropagationFlags?: MtlPropagationFlags
  MatTemplate?: string
  MtlFlags: MtlFlags
  Name: string
  Opacity?: number
  PublicParams?: MtlPublicParams | string
  Shader?: MtlShader
  Shininess?: number
  Specular?: string
  StringGenMask?: string
  SubMaterials?: MtlSubMaterials | string
  SurfaceType?: MtlSurfaceType
  Textures?: MtlTextures | string
  VertexDeform?: MtlVertexDeform
  vertModifType?: number
  VoxelCoverage?: number
}

export interface MtlSubMaterials {
  Material: MtlObject[] | MtlObject
}

export interface MtlDetailDecal {
  Opacity: number
  SSAOAmount: number
  bottomDeformation: number
  bottomOffsU: number
  bottomOffsV: number
  bottomRotation: number
  bottomSortOffset: number
  bottomTileU: number
  bottomTileV: number
  topDeformation: number
  topOffsU: number
  topOffsV: number
  topRotation: number
  topSortOffset: number
  topTileU: number
  topTileV: number
}

export interface MtlLayers {
  Layer: Array<MtlLayer | string>
}

export interface MtlLayer {
  FadeOut: number
  Name: MtlShader
  NoDraw: number
  PublicParams: MtlPublicParams
}

export interface MtlPropagationFlags {
  flags: number
}

export type MtlShader =
  | 'CloakLayer'
  | 'Coatlicue-Terrain'
  | 'Distanceclouds'
  | 'FogVolume.Box'
  | 'FogVolume.Ellipsoid'
  | 'Fxmeshadvanced'
  | 'Fxmeshadvancedtransp'
  | 'GeometryBeam'
  | 'GeometryBeamSimple'
  | 'GeometryFogNoVertAlpha'
  | 'Geometrybeam'
  | 'Geometrybeamsimple'
  | 'Geometryfog'
  | 'Geometryfognovertalpha'
  | 'Glass'
  | 'Hair'
  | 'Hologram'
  | 'HumanSkin'
  | 'Humanskin'
  | 'Illum'
  | 'Illum_oceansplash'
  | 'Lensoptics.Enable'
  | 'LightBeam.LightBeam'
  | 'Lightbeam.LightBeam'
  | 'Meshparticle'
  | 'NoDraw'
  | 'Nodraw'
  | 'Non-Initialized Shader name'
  | 'Particleimposter'
  | 'Particles'
  | 'Silhouette_Always'
  | 'Silhouette_always'
  | 'Silhouette_xray'
  | 'Sky'
  | 'SkyHDR'
  | 'Templbeamproc'
  | 'Terrain.Layer'
  | 'Terraintilecomposite'
  | 'Vegetation'
  | 'VolumeObject'
  | 'Water'
  | 'WaterFogVolume.Into'
  | 'WaterFogVolume.OceanInto'
  | 'WaterFogVolume.OceanIntoLowSpec'
  | 'WaterFogVolume.OceanOutof'
  | 'WaterFogVolume.OceanOutofLowSpec'
  | 'WaterFogVolume.Outof'
  | 'WaterOceanBottom'
  | 'WaterVolume'
  | 'Watervolume'

export type MtlSurfaceType =
  | ''
  | 'mat_bark'
  | 'mat_concrete'
  | 'mat_corruption'
  | 'mat_corruption_core'
  | 'mat_default'
  | 'mat_dirt'
  | 'mat_fabric'
  | 'mat_flesh'
  | 'mat_glass'
  | 'mat_glass_unbreakable'
  | 'mat_grass'
  | 'mat_holy_shield'
  | 'mat_ice'
  | 'mat_leaves'
  | 'mat_metal'
  | 'mat_mud'
  | 'mat_nodraw'
  | 'mat_pineneedles'
  | 'mat_plaster'
  | 'mat_rock'
  | 'mat_rock_wet'
  | 'mat_sand'
  | 'mat_sand_wet'
  | 'mat_thatch'
  | 'mat_vegetation'
  | 'mat_water'
  | 'mat_water_deep'
  | 'mat_water_shallow'
  | 'mat_wood'
  | 'mat_wood_notraverse'
  | 'mat_woodcursed'

export interface MtlPublicParams {
  AlphaBlendMultiplier?: number
  AlphaSaturation?: number
  AmbStrength?: number
  AnimAmplitude?: number
  AnimOffset?: number
  AnimSpeed?: number
  Attenuation?: number
  BackDiffuseMultiplier?: number
  BackgroudAlphaNoiseSpeedX?: number
  BackgroudAlphaNoiseSpeedY?: number
  BackgroudAlphaNoiseSpeedZ?: number
  BackLightScale?: number
  BackViewDep?: number
  baseUVScale?: number
  BeamLength?: number
  bendDetailBranchAmplitude?: number
  bendDetailFrequency?: number
  bendDetailLeafAmplitude?: number
  BlendFactor?: number
  BlendFalloff?: number
  BlendLayer2Diffuse?: string
  BlendLayer2Smoothness?: number
  BlendLayer2Specular?: number | string
  BlendLayer2Tiling?: number
  BlendMaskTiling?: number
  BlendTerrainCol?: number
  BlendTerrainColDist?: number
  BlurAmount?: number
  Brightness?: number
  BumpAnimSpeed?: number
  BumpMapTile?: number
  BumpScale?: number
  BumpTilling?: number
  CapOpacityFalloff?: number
  CloudinessMasksBlur?: number
  CloudinessReducesGloss?: number
  ColLookupAmplitude?: number | MtlColor
  ColLookupColPhase?: number | MtlColor
  ColorMaskAlphaInf?: MtlColor | number
  ColorMaskOverride?: number
  ColorMaskStrength?: number
  COMPLEX_COL_TILE?: number
  DecalAlphaMult?: number
  DecalDiffuseOpacity?: number
  DecalFalloff?: number
  DecalStrength?: number
  DecalTilling?: number
  DeformAmount?: number
  DeformAnimSpeed?: number
  DeformTile?: number
  DepthBias?: number
  DepthFixupThreshold?: number
  DetailBumpScale?: number
  DetailBumpTillingU?: number
  DetailBumpTillingV?: number
  DetailDiffuseScale?: number
  DetailGlossScale?: number
  DetailNormalsScale?: number
  DetailTextureStrength?: number
  DetailTilling?: number
  DiffuseRange?: number
  DiffuseWrap?: number
  DISSOLVE_FRESNEL_FALLOFF?: number
  DISSOLVE_FRESNEL_INVERT?: number
  DISSOLVE_PERCENT?: number
  DissolveColor?: MtlColor
  DissolveEdgeThickness?: number
  DissolvePercentage?: MtlColor
  dustTimeScale?: number
  dustUVScale?: number
  EdgeColor?: MtlColor
  EmissiveScaleIntensity?: MtlColor
  EmittanceMapGamma: number
  EndColor: MtlColor
  EndRadius?: number
  EnvCubeReflMul?: number
  EnvCubeScale?: number
  FacialMarkingColor?: MtlColor
  FadeOutDistance?: number
  fadingFeaturing: number
  farFadeSize?: number
  farFadeStart?: number
  fFadeDist?: number
  fFadeScale?: number
  fGlobalDensity?: number
  FinalMultiplier: number
  fNoiseCoordScale?: number
  fNoiseDirX?: number
  fNoiseDirY?: number
  fNoiseDirZ?: number
  fNoiseStrength?: number
  FoamAmount?: number
  FoamCrestAmount?: number
  FoamNormalFade?: number
  FoamNormalScale?: number
  FoamNormalSeparation?: number
  FoamNormalTiling?: number
  FoamSoftIntersectionFactor?: number
  FoamTilling?: number
  FoamTransitionSpeed?: number
  FogColor?: string
  FogColorInfluence?: number
  FogCutoffEnd?: number
  FogDensity?: number
  FRESNEL_EXPONENT?: number
  FRESNEL_IN_FALLOFF?: number
  FRESNEL_IN_SDF_INF?: number
  FRESNEL_IN_STRENGTH?: number
  FRESNEL_INVERT?: number
  FRESNEL_OUT_FALLOFF?: number
  FRESNEL_OUT_SDF_INF?: number
  FRESNEL_OUT_STRENGTH?: number
  FRESNEL_SDF_INFLUENCE?: number
  FRESNEL_SDF_MAP_EXP?: number
  FRESNEL_SDF_MAP_MIX?: number
  FRESNEL_STRENGTH?: number
  FresnelBias?: MtlColor | number
  FresnelGloss?: number
  FresnelPower?: number
  FresnelScale?: number | MtlColor
  FX_NORMAL_STRENGTH?: number
  FX_NORMAL_TILE_X?: number
  FX_NORMAL_TILE_Y?: number
  g_macroBlendStrength?: number
  g_macroDiffuseSaturation?: number
  g_macroGlossBlendStrength?: number
  g_materialLayerBlendFactor?: number
  g_materialLayerBlendFalloff?: number
  g_materialLayerHeightOffset?: number
  g_materialLayerHeightScale?: number
  GlobalAlphaFalloff?: number
  GlobalAlphaFill?: number
  GlobalAlphaFromSource?: number
  GlobalAlphaStrength?: number
  GlobalColorFalloff?: number
  GlobalDensity?: number
  GlobalIlluminationAmount?: number
  GlossFromDiffuseAmount?: MtlColor | number
  GlossFromDiffuseBrightness?: number | string
  GlossFromDiffuseContrast?: MtlColor | number
  GlossFromDiffuseOffset?: MtlColor | number
  GlossMapBias?: number
  GlossMapScale?: number
  GlossMapTilling?: number
  GradientScale?: number
  HeightBias?: number | string
  HeightScale?: number
  IndirectColor: MtlColor
  InterferenceContrast?: number
  InterferenceSizeScale?: number
  InterferenceSpeedScale?: number
  INTERSECT_FADE_DIST?: number
  INTERSECT_FADE_FALLOFF?: number
  INTERSECT_FADE_INV?: number
  INTERSECT_GLOW_DIST?: number
  INTERSECT_GLOW_FALLOFF?: number
  INTERSECT_GLOW_INV?: number
  JitterScale?: number
  Mask_A_Color?: MtlColor
  Mask_A_Gloss?: number
  Mask_A_GlossShift?: number
  Mask_A_SpecColor_Override?: number
  Mask_A_SpecColor?: MtlColor
  Mask_A_SpecColorOverride?: number
  Mask_A?: number
  Mask_B_Color?: MtlColor
  Mask_B_Override?: number
  Mask_B?: number
  Mask_G_Color?: MtlColor
  Mask_G_Override?: number
  Mask_G?: number
  Mask_R_Color?: MtlColor
  Mask_R_Override?: number
  Mask_R?: number
  MaxShadowDensity?: number
  Melanin?: number
  MinHeight?: number
  MinShadowDensity?: number
  MtlColor?: MtlColor
  nearFadeSize?: number
  nearFadeStart?: number
  NormalsScale?: number
  NormalViewDependency?: number
  ObmDisplacement?: number
  OrigLength?: number
  OrigWidth?: number
  PALETTE_FALLOFF?: number
  PALETTE_PHASE?: number
  PALETTE_SDF_INF?: number
  PALETTE_SOURCE_BLEND?: number
  PALETTE_SPEED?: number
  PomDisplacement?: number | string
  PROC_GRAD_FREQ?: number
  PROC_GRAD_INV?: number
  PROC_GRAD_POS_X?: number
  PROC_GRAD_POS_Y?: number
  PROC_GRAD_POS_Z?: number
  PROC_GRAD_TYPE?: number
  RainTilling?: number
  RealtimeReflMul?: number
  ReflectionBumpScale?: number
  ReflectionScale?: number
  RefractionBumpScale?: number
  RefrBumpScale?: number
  Rim_Blend_Center_Alpha?: number
  Rim_Blend_Center_Color?: MtlColor
  Rim_Blend_Color_Blend?: number
  Rim_Blend_Fill_Alpha?: number
  Rim_Blend_Fill_Color?: MtlColor
  Rim_Blend_Fill_Width?: number
  Rim_Blend_Major_Alpha?: number
  Rim_Blend_Major_Color?: MtlColor
  Rim_Blend_Major_Width?: number
  Rim_Blend_Smoothness?: number
  Rim_Center_Color?: MtlColor
  Rim_Center_Intensity?: number | MtlColor
  Rim_Color_Blend?: number | MtlColor
  Rim_Fill_Color?: MtlColor
  Rim_Fill_Intensity?: number | MtlColor
  Rim_Fill_Width?: number | MtlColor
  Rim_Major_Color?: MtlColor
  Rim_Major_Intensity?: number | MtlColor
  Rim_Major_Width?: number | MtlColor
  Rim_Smoothness?: number | MtlColor
  RoughnessBoost?: number
  RoughnessMaxFootprint?: number
  ScarColor?: MtlColor
  ScarNormalStrength?: number
  ScarTissue?: number
  SDF_2D_MASK_NOISE_AMPLIFICATION?: number
  SDF_2D_MASK_NOISE_FREQUENCY?: number
  SDF_2D_MASK_TILE_X?: number
  SDF_2D_MASK_TILE_Y?: number
  SDF_2D_PHASE_X?: number
  SDF_2D_PHASE_Y?: number
  SDF_2D_SPEED_X?: number
  SDF_2D_SPEED_Y?: number
  SDF_2D_STRENGTH?: number
  SDF_2D_TILE_X?: number
  SDF_2D_TILE_Y?: number
  SecondaryHighlightColor?: MtlColor
  SecondaryHighlightShiftAmount?: number
  SecondaryHighlightWidth?: number
  SelfShadowStrength?: number | string
  ShadowFadingInclinationFactor?: number
  ShadowFadingRadiusFactor?: number
  ShadowPower?: number
  ShadowSkydomeSize?: number
  ShiftVariation?: number
  SilPomDisplacement?: number
  SilPomNumSteps?: number
  SilPomStepSizeViewDep?: number
  SINEWAVE_AMP?: number
  SINEWAVE_AXIS?: number
  SINEWAVE_FREQ?: number
  SINEWAVE_NORMAL?: number
  SINEWAVE_PHASE?: number
  SINEWAVE_SPEED?: number
  SkyColorMultiplier?: number
  SoftIntersection?: number
  SoftIntersectionFactor: number
  SoftParticlesScale?: number
  SOURCE_2D_PHASE_X?: number
  SOURCE_2D_PHASE_Y?: number
  SOURCE_2D_SPEED_X?: number
  SOURCE_2D_SPEED_Y?: number
  SOURCE_2D_TILE_X?: number
  SOURCE_2D_TILE_Y?: number
  SparksTilling?: number
  SSSIndex?: number | MtlColor
  StartColor: MtlColor
  StartRadius?: number
  STENCIL_INVERT?: number
  STENCIL_NORMAL_INFLUENCE?: number
  STENCIL_OFFSET_X?: number
  STENCIL_OFFSET_Y?: number
  StepSize?: number
  SUB_SURFACE_CLARITY?: number
  SUB_SURFACE_COLOR?: string
  SUB_SURFACE_DETAIL_BLEND?: number
  SUB_SURFACE_DETAIL_POW?: number
  SUB_SURFACE_FALLOFF?: number
  SUB_SURFACE_PARALLAX?: number
  SUB_SURFACE_THRESHOLD?: number
  SUB_SURFACE_TILE?: number
  SubSurfaceScatteringScale?: number
  SunColorInfluence?: number
  SunColorMultiplier?: number
  TattooColor?: MtlColor
  TessellationDispBias?: number
  TessellationFaceCull?: number
  TessellationFactor?: number
  TessellationFactorMax?: number
  TessellationFactorMin?: number
  TessellationHeightScale?: number
  ThinHairThreshold?: number
  Tilling?: number
  TintCloudiness?: number
  TranslucencyMultiplier?: number
  TransmittanceColor?: string
  turbRatio?: number
  turbStrength?: number
  uvRot?: number
  uvVigFeaturing?: number
  VertexAlphaBlendFactor?: MtlColor | number
  VertexWaveScale?: number
  viewDependencyFactor: number
  vNoiseSpeed?: number
  VolumetricScale?: number
  WaterFlowMapScale?: number
  WaterFlowSpeed?: number
}

export type MtlColorRGB = `${number},${number},${number}`
export type MtlColorRGBA = `${number},${number},${number},${number}`
export type MtlColor = MtlColorRGB | MtlColorRGBA

export interface MtlVertexDeform {
  DividerW?: number
  DividerX?: number
  DividerY?: number
  DividerZ?: MtlColor
  NoiseScale?: MtlColor
  Type?: MtlColor
  WaveX?: MtlVertexDeformWave | string
  WaveY?: MtlVertexDeformWave
}

export interface MtlVertexDeformWave {
  Amp: number
  Freq: number
  Level: number
  Phase: number
  Type: number
}

export interface MtlTextures {
  Texture: MtlTexture[] | MtlTexture
}

export interface MtlTexture {
  AssetId?: string
  File: string
  Filter?: number
  IsTileU?: number
  IsTileV?: number
  Map: MtlMap
  TexMod?: MtlTexMod
  TexType?: number
}

export type MtlMap =
  | 'Bumpmap'
  | 'Custom'
  | 'Decal'
  | 'Detail'
  | 'Diffuse'
  | 'Emittance'
  | 'Environment'
  | 'Heightmap'
  | 'Occlusion'
  | 'Opacity'
  | 'SecondSmoothness'
  | 'Smoothness'
  | 'Specular'
  | 'Specular2'
  | 'SubSurface'
  | '[1] Custom'
  | '[2] Custom'
  | '[3] Custom'
  | '[4] Custom'
  | '[5] Custom'
  | '[5] Smoothness'

export interface MtlTexMod {
  OffsetU?: number
  OffsetV?: number
  RotateU?: number
  RotateV?: number
  RotateW?: number
  TexMod_bTexGenProjected: number
  TexMod_RotateType: number
  TexMod_TexGenType: number
  TexMod_UOscillatorAmplitude?: number
  TexMod_UOscillatorPhase?: number
  TexMod_UOscillatorRate?: number
  TexMod_UOscillatorType?: number
  TexMod_URotateAmplitude?: number
  TexMod_URotateCenter?: number
  TexMod_URotatePhase?: number
  TexMod_URotateRate?: number
  TexMod_VOscillatorAmplitude?: number
  TexMod_VOscillatorPhase?: number
  TexMod_VOscillatorRate?: number
  TexMod_VOscillatorType?: number
  TexMod_VRotateAmplitude?: number
  TexMod_VRotateCenter?: number
  TexMod_VRotatePhase?: number
  TexMod_VRotateRate?: number
  TexMod_WRotateAmplitude?: number
  TexMod_WRotatePhase?: number
  TexMod_WRotateRate?: number
  TileU?: number
  TileV?: number
}
