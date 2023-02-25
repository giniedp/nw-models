export const enum FileVersion {
  CryTek1And2 = 0x744,
  CryTek3 = 0x745,
  CryTek_3_6 = 0x746,
}
export const enum FileType {
  GEOM = 0xffff0000,
  ANIM = 0xffff0001,
}

export interface FileHeader {
  type?: FileType
  version: FileVersion
  chunkCount: number
  chunkOffset: number
}

export interface ChunkHeader {
  type: number
  version: number
  offset: number
  id: number
  size: number
}

export const enum ChunkType {
  Any = 0x0,
  Mesh = 0xcccc0000,
  Helper = 0xcccc0001,
  VertAnim = 0xcccc0002,
  BoneAnim = 0xcccc0003,
  GeomNameList = 0xcccc0004,
  BoneNameList = 0xcccc0005,
  MtlList = 0xcccc0006,
  MRM = 0xcccc0007, //obsolete
  SceneProps = 0xcccc0008,
  Light = 0xcccc0009,
  PatchMesh = 0xcccc000a,
  Node = 0xcccc000b,
  Mtl = 0xcccc000c,
  Controller = 0xcccc000d,
  Timing = 0xcccc000e,
  BoneMesh = 0xcccc000f,
  BoneLightBinding = 0xcccc0010,
  MeshMorphTarget = 0xcccc0011,
  BoneInitialPos = 0xcccc0012,
  SourceInfo = 0xcccc0013, // Describes the source from which the cgf was exported: source max file, machine and user.
  MtlName = 0xcccc0014, // provides material name as used in the material.xml file
  ExportFlags = 0xcccc0015, // Describes export information.
  DataStream = 0xcccc0016, // A data Stream
  MeshSubsets = 0xcccc0017, // Describes an array of mesh subsets
  MeshPhysicsData = 0xcccc0018, // Physicalized mesh data
  CompiledBones = 0xacdc0000,
  CompiledPhysicalBones = 0xacdc0001,
  CompiledMorphTargets = 0xacdc0002,
  CompiledPhysicalProxies = 0xacdc0003,
  CompiledIntFaces = 0xacdc0004,
  CompiledIntSkinVertices = 0xacdc0005,
  CompiledExt2IntMap = 0xacdc0006,
  BreakablePhysics = 0xacdc0007,
  FaceMap = 0xaafc0000, // unknown chunk
  SpeedInfo = 0xaafc0002, // Speed and distnace info
  FootPlantInfo = 0xaafc0003, // Footplant info
  BonesBoxes = 0xaafc0004, // unknown chunk
  FoliageInfo = 0xaafc0005, // unknown chunk
  // Star Citizen versions
  NodeSC = 0xcccc100b,
  CompiledBonesSC = 0xcccc1000,
  CompiledPhysicalBonesSC = 0xcccc1001,
  CompiledMorphTargetsSC = 0xcccc1002,
  CompiledPhysicalProxiesSC = 0xcccc1003,
  CompiledIntFacesSC = 0xcccc1004,
  CompiledIntSkinVerticesSC = 0xcccc1005,
  CompiledExt2IntMapSC = 0xcccc1006,
  UnknownSC1 = 0xcccc2004,
  BoneBoxesSC = 0x08013004,
  // Star Citizen #ivo file chunks
  MtlNameIvo = 0x8335674e,
  CompiledBonesIvo = 0xc201973c, // Skeleton
  CompiledPhysicalBonesIvo = 0x90c687dc, // Physics
  MeshIvo = 0x9293b9d8, // SkinInfo
  IvoSkin = 0xb875b2d9, // SkinMesh
  BShapesGPU = 0x57a3befd,
  BShapes = 0x875ccb28,

  BinaryXmlDataSC = 0xcccbf004,
}
