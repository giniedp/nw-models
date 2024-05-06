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
  typeName: string
  version: number
  offset: number
  id: number
  size: number
}

export interface Chunk {
  header: ChunkHeader
}

export enum ChunkType {
  ANY     = 0,

  Mesh = 0x1000,  // was 0xCCCC0000 in chunk files with versions <= 0x745
  Helper,
  VertAnim,
  BoneAnim,
  GeomNameList, // obsolete
  BoneNameList,
  MtlList,      // obsolete
  MRM,          // obsolete
  SceneProps,   // obsolete
  Light,        // obsolete
  PatchMesh,    // not implemented
  Node,
  Mtl,          // obsolete
  Controller,
  Timing,
  BoneMesh,
  BoneLightBinding, // obsolete. describes the lights binded to bones
  MeshMorphTarget,  // describes a morph target of a mesh chunk
  BoneInitialPos,   // describes the initial position (4x3 matrix) of each bone; just an array of 4x3 matrices
  SourceInfo, // describes the source from which the cgf was exported: source max file, machine and user
  MtlName, // material name
  ExportFlags, // Special export flags.
  DataStream, // Stream data.
  MeshSubsets, // Array of mesh subsets.
  MeshPhysicsData, // Physicalized mesh data.

  // these are the new compiled chunks for characters
  CompiledBones = 0x2000,  // was 0xACDC0000 in chunk files with versions <= 0x745
  CompiledPhysicalBones,
  CompiledMorphTargets,
  CompiledPhysicalProxies,
  CompiledIntFaces,
  CompiledIntSkinVertices,
  CompiledExt2IntMap,

  BreakablePhysics = 0x3000,  // was 0xAAFC0000 in chunk files with versions <= 0x745
  FaceMap,         // obsolete
  MotionParameters,
  FootPlantInfo,   // obsolete
  BonesBoxes,
  FoliageInfo,
  Timestamp,
  GlobalAnimationHeaderCAF,
  GlobalAnimationHeaderAIM,
  BspTreeData
}

export enum ControllerType {
  NONE,
  CRYBONE,
  LINEAR1,
  LINEAR3,
  LINEARQ,
  BEZIER1,
  BEZIER3,
  BEZIERQ,
  TBC1,
  TBC3,
  TBCQ,
  BSPLINE2O,
  BSPLINE1O,
  BSPLINE2C,
  BSPLINE1C,
  CONST, // this was given a value of 11, which is the same as BSPLINE2o.
}

export enum DataStreamType {
  POSITIONS,
  NORMALS,
  TEXCOORDS,
  COLORS,
  COLORS2,
  INDICES,
  TANGENTS,
  SHCOEFFS,
  SHAPEDEFORMATION,
  BONEMAPPING,
  FACEMAP,
  VERT_MATS,
  QTANGENTS,
  SKINDATA,
  DUMMY2_, // used to be old console specific, dummy is needed to keep existing assets loadable
  P3S_C4B_T2S,
  NUM_TYPES,
}

export interface Key {
  time: number // Time in ticks
  position: Vector3 // absolute position
  translation: Vector3 // relative position
  rotation: Quaternion //Relative Quaternion if ARG==1?
  unknown1: Vector3 // If ARG==6 or 10?
  unknown2: number[] // If ARG==9?  array length = 2
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

// 0x7fffffff in binary is: 0111 1111 1111 1111 1111 1111 1111 1111
