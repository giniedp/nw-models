import * as fs from 'fs'
import { BinaryReader } from '../cgf/binary-reader'

export async function readTerrainDataFile(file: string): Promise<TerrainData> {
  const buffer = await fs.promises.readFile(file)
  const reader = new BinaryReader(buffer.buffer as any)
  const header = readHeader(reader)
  readGroups(reader)
  const settings = getTerrainSettings(header.terrainInfo)
  const numNodes = getNumTerrainNodes(header)
  const chunks: TerrainChunk[] = []
  for (let i = 0; i < numNodes; i++) {
    chunks.push(readTerrainChunk(reader, settings))
  }
  const objects = readObjectsTree(reader)
  return {
    header,
    chunks,
    objects,
  }
}

export interface TerrainData {
  header: TerrainHeader
  chunks: TerrainChunk[]
  objects: ObjectsTree
}

export interface TerrainHeader {
  version: number
  dummy: number
  flags1: number
  flags2: number
  chunkSize: number
  terrainInfo: TerrainInfo
}

export interface TerrainInfo {
  heightmapSizeInUnits: number
  unitSizeInMeters: number
  sectorSizeInMeters: number

  sectorsTableSizeInSectors: number
  heightMapZRatio: number
  oceanWaterLevel: number
}

export interface TerrainSettings {
  unitSize: number
  invUnitSize: number
  terrainSize: number
  meterToUnitBitShift: number
  terrainSizeDiv: number
  sectorSize: number
  sectorsTableSize: number
  unitToSectorBitShift: number
  sectorSizeInUnits: number
}

function readHeader(r: BinaryReader): TerrainHeader {
  const version = r.readInt8()
  if (version < 24 || version > 29) {
    throw new Error(`unsupported version ${version}`)
  }
  return {
    version,
    dummy: r.readInt8(),
    flags1: r.readInt8(),
    flags2: r.readInt8(),
    chunkSize: r.readInt32(),
    terrainInfo: readTerrainInfo(r),
  }
}

function readTerrainInfo(r: BinaryReader): TerrainInfo {
  return {
    heightmapSizeInUnits: r.readInt32(),
    unitSizeInMeters: r.readInt32(),
    sectorSizeInMeters: r.readInt32(),
    sectorsTableSizeInSectors: r.readInt32(),
    heightMapZRatio: r.readFloat32(),
    oceanWaterLevel: r.readFloat32(),
  }
}

function getTerrainSettings(info: TerrainInfo): TerrainSettings {
  const unitSize = info.unitSizeInMeters
  const invUnitSize = 1 / unitSize
  const terrainSize = info.heightmapSizeInUnits * info.unitSizeInMeters
  let meterToUnitBitShift = 0
  {
    let shift = 0
    while (1 << shift < unitSize) {
      shift++
    }
    meterToUnitBitShift = shift
  }

  const terrainSizeDiv = (terrainSize >> meterToUnitBitShift) - 1
  const sectorSize = info.sectorSizeInMeters
  const sectorsTableSize = info.sectorsTableSizeInSectors
  let unitToSectorBitShift = 0
  while (sectorSize >> unitToSectorBitShift > unitSize) {
    unitToSectorBitShift++
  }
  const sectorSizeInUnits = (1 << unitToSectorBitShift) + 1
  return {
    unitSize,
    invUnitSize,
    terrainSize,
    meterToUnitBitShift,
    terrainSizeDiv,
    sectorSize,
    sectorsTableSize,
    unitToSectorBitShift,
    sectorSizeInUnits,
  }
}

function readGroups(r: BinaryReader) {
  const numStaticGroups = r.readInt32()
  if (numStaticGroups > 0) {
    // TODO: read static groups
    throw new Error(`unsupported numStaticGroups ${numStaticGroups}`)
  }
  const numBrushObjects = r.readInt32()
  const brushObjects: string[] = []
  if (numBrushObjects > 0) {
    for (let i = 0; i < numBrushObjects; i++) {
      brushObjects.push(r.readString(0x100))
    }
  }
  const numBrushMaterials = r.readInt32()
  const brushMaterials = []
  if (numBrushMaterials > 0) {
    for (let i = 0; i < numBrushMaterials; i++) {
      brushMaterials.push(r.readString(0x100))
    }
  }
}

function getNumTerrainNodes(header: TerrainHeader) {
  const info = header.terrainInfo
  const sectorSize = info.sectorSizeInMeters
  let nodeSize = info.heightmapSizeInUnits * info.unitSizeInMeters
  let numTerrainNodes = 0
  let quadtreeFloorIndex = 0
  do {
    numTerrainNodes += (1 << quadtreeFloorIndex) * (1 << quadtreeFloorIndex)
    nodeSize = nodeSize >> 1
    quadtreeFloorIndex++
  } while (nodeSize >= sectorSize && nodeSize > 0)
  return numTerrainNodes
}

export interface TerrainChunkHeader {
  version: number
  hasHoles: number
  aabb: {
    min: number[]
    max: number[]
  }
  offset: number
  range: number
  size: number
  surfaceType: number
}

export interface SurfaceWeight {
  ids: [number, number, number]
  weights: [number, number, number]
}

export interface TerrainChunk {
  header: TerrainChunkHeader
  heightmap: number[]
  weights: SurfaceWeight[]
  lodErrors: number[]
  surfaceType: number[]
}

function readTerrainChunkHeader(r: BinaryReader) {
  const version = r.readUInt16()
  if (version !== 8) {
    throw new Error(`unsupported version ${version} (0x${(r.position - 2).toString(16)})`)
  }
  return {
    version: version,
    hasHoles: r.readUInt16(),
    aabb: {
      min: r.readFloat32Array(3),
      max: r.readFloat32Array(3),
    },
    offset: r.readFloat32(),
    range: r.readFloat32(),
    size: r.readUInt32(),
    surfaceType: r.readUInt32(),
  }
}

function readTerrainChunk(r: BinaryReader, settings: TerrainSettings): TerrainChunk {
  const header = readTerrainChunkHeader(r)
  let heightmap: number[] = []
  let weights: SurfaceWeight[] = []
  let lodErrors: number[] = []
  let surfaceType: number[] = []
  if (header.version !== 8) {
    throw new Error(`unsupported version ${header.version}`)
  }

  if (header.size) {
    if (settings.sectorSizeInUnits !== header.size) {
      throw new Error(`sectorSizeInUnits doesn't match its value in STerrainNodeChunk.nSize`)
    }

    const sizeSquare = header.size * header.size
    heightmap = r.readUInt16Array(sizeSquare)
    r.alignPosition(4)
    for (let i = 0; i < sizeSquare; i++) {
      weights.push({
        ids: r.readUInt8Array(3) as [number, number, number],
        weights: r.readUInt8Array(3) as [number, number, number],
      })
    }
    r.alignPosition(4)
  }

  lodErrors = r.readFloat32Array(settings.unitToSectorBitShift)
  if (header.surfaceType) {
    surfaceType = r.readUInt8Array(header.surfaceType)
    r.alignPosition(4)
  }
  return {
    header,
    heightmap,
    weights,
    lodErrors,
    surfaceType,
  }
}

export interface ObjectsTreeHeader {
  version: number
  childsMask: number
  aabb: {
    min: [number, number, number]
    max: [number, number, number]
  }
  blockSize: number
}

export interface ObjectsTree {
  header: ObjectsTreeHeader
  data: EERType[]
  children: ObjectsTree[]
}

function readObjectsTreeHeader(r: BinaryReader): ObjectsTreeHeader {
  const version = r.readUInt16()
  if (version !== 5) {
    throw new Error(`unsupported version ${version}`)
  }
  return {
    version,
    childsMask: r.readUInt16(),
    aabb: {
      min: r.readFloat32Array(3) as any,
      max: r.readFloat32Array(3) as any,
    },
    blockSize: r.readUInt32(),
  }
}

function readObjectsTree(r: BinaryReader): ObjectsTree {
  const header = readObjectsTreeHeader(r)
  const data = r.readUInt8Array(header.blockSize) as EERType[]
  const children: ObjectsTree[] = []
  for (let i = 0; i < 8; i++) {
    if (header.childsMask & (1 << i)) {
      readObjectsTree(r)
    }
  }
  return { header, data, children }
}
