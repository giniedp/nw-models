import { BinaryReader } from '../../../utils/binary-reader'

export enum ECompressionFormat {
  NoCompress = 0,
  NoCompressQuat = 1,
  NoCompressVec3 = 2,
  ShotInt3Quat = 3,
  SmallTreeDWORDQuat = 4,
  SmallTree48BitQuat = 5,
  SmallTree64BitQuat = 6,
  PolarQuat = 7,
  SmallTree64BitExtQuat = 8,
  AutomaticQuat = 9,
}

export enum EKeyTimesFormat {
  F32,
  UINT16,
  Byte,
  F32StartStop,
  UINT16StartStop,
  ByteStartStop,
  Bitset,
}

export interface BonePhysics {
  // id of a separate mesh for this bone
  physGeom: number // int
  flags: number // int
  min: number[] // float[3]
  max: number[] // float[3];
  springAngle: number[] // float[3];
  springTension: number[] // float[3];
  damping: number[] // float[3];
  frameMatrix: number[][] // float[3][3];
}

export function readBonePhysics(r: BinaryReader): BonePhysics {
  return {
    physGeom: r.readInt32(),
    flags: r.readInt32(),
    min: r.readFloat32Array(3),
    max: r.readFloat32Array(3),
    springAngle: r.readFloat32Array(3),
    springTension: r.readFloat32Array(3),
    damping: r.readFloat32Array(3),
    frameMatrix: r.readArray(3, () => r.readFloat32Array(3)),
  }
}

export interface BoneData {
  controllerId: number // int, unique id of bone (generated from bone name)

  // [Sergiy] physics info for different lods
  // lod 0 is the physics of alive body, lod 1 is the physics of a dead body
  info: [BonePhysics, BonePhysics]
  mass: number // float, mass of bone

  worldToBone: number[] // Matrix34 intitalpose matrix World2Bone
  boneToWorld: number[] // Matrix34 intitalpose matrix Bone2World

  boneName: string // char[256];

  limbId: number // int set by model state class

  // this bone parent is this[m_nOffsetParent], 0 if the bone is root. Normally this is <= 0
  m_nOffsetParent: number // int

  // The whole hierarchy of bones is kept in one big array that belongs to the ModelState
  // Each bone that has children has its own range of bone objects in that array,
  // and this points to the beginning of that range and defines the number of bones.
  m_numChildren: number // unsigned;
  // the beginning of the subarray of children is at this[m_nOffsetChildren]
  // this is 0 if there are no children
  m_nOffsetChildren: number // int
}

export function readBoneData(r: BinaryReader): BoneData {
  return {
    controllerId: r.readUInt32(),
    info: [readBonePhysics(r), readBonePhysics(r)],
    mass: r.readFloat32(),
    worldToBone: r.readFloat32Array(12),
    boneToWorld: r.readFloat32Array(12),
    boneName: r.readStringNT(256),
    limbId: r.readUInt32(),
    m_nOffsetParent: r.readInt32(),
    m_numChildren: r.readUInt32(),
    m_nOffsetChildren: r.readInt32(),
  }
}
export interface BoneEntity {
  boneId: number // int
  parentId: number // int
  numChildren: number // int

  // Id of controller (CRC32 From name of bone).
  controllerId: number // int

  prop: string // char[32];
  phys: BonePhysics
}

export function readBoneEntity(r: BinaryReader): BoneEntity {
  return {
    boneId: r.readInt32(),
    parentId: r.readInt32(),
    numChildren: r.readInt32(),
    controllerId: r.readInt32(),
    prop: r.readStringNT(32),
    phys: readBonePhysics(r),
  }
}

export interface MeshSubset {
  firstIndex: number // int
  numIndices: number // int
  firstVertex: number // int
  numVertices: number // int
  materialId: number // int
  radius: number // float
  center: number[] // Vector3
}

export function readMeshSubset(r: BinaryReader): MeshSubset {
  return {
    firstIndex: r.readInt32(),
    numIndices: r.readInt32(),
    firstVertex: r.readInt32(),
    numVertices: r.readInt32(),
    materialId: r.readInt32(),
    radius: r.readFloat32(),
    center: r.readFloat32Array(3),
  }
}

export interface IntSkinVertex {
  obsolete0: number[] // Vector3
  position: number[] // Vector3
  obsolete2: number[] // Vector3
  boneIds: number[] // ushort[]     // 4 bone IDs
  weights: number[] // float[]     // Should be 4 of these
  color: number[] // IRGBA
}

export function readIntSkinVertex(r: BinaryReader): IntSkinVertex {
  return {
    obsolete0: r.readFloat32Array(3),
    position: r.readFloat32Array(3),
    obsolete2: r.readFloat32Array(3),
    boneIds: r.readUInt16Array(4),
    weights: r.readFloat32Array(4),
    color: r.readInt8Array(4),
  }
}

export interface IntSkinFace {
  i0: number // ushort
  i1: number // ushort
  i2: number // ushort
}

export function readIntSkinFace(r: BinaryReader): IntSkinFace {
  return {
    i0: r.readUInt16(),
    i1: r.readUInt16(),
    i2: r.readUInt16(),
  }
}
