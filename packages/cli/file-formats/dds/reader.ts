import fs from 'node:fs'
import { BinaryReader } from '../../utils/binary-reader'
import { glob } from '../../utils/file-utils'
import { DDSHeader } from './types'

export async function readDdsFile(file: string) {
  const data = await fs.promises.readFile(file)
  const reader = new BinaryReader(data.buffer as any)
  const header = readHeader(reader)
  const mips = await glob(file + '.*', {
    caseSensitiveMatch: false,
  })
  // some dds images are split into multiple files and have the ending
  // - .dds.1
  // - .dds.2
  // ... etc.
  // Those are actually mipmaps that can be stitched to the given input file
  const mipFiles = mips.filter((it) => !!it.match(/\d$/)).sort()

  // Some files have additional mipmaps
  // - .dds.1a
  // - .dds.2a
  // They can be stitched to the same header file, but as a separate texture
  const mipFilesAlpha = mips.filter((it) => !!it.match(/\da$/)).sort()
  return {
    file,
    header,
    mipFiles,
    mipFilesAlpha,
  }
}

function readHeader(r: BinaryReader): DDSHeader {
  const magic = r.readString(4)
  if (magic !== 'DDS ') {
    throw new Error('Invalid DDS file')
  }
  return {
    size: r.readUInt32(),
    flags: r.readUInt32(),
    height: r.readUInt32(),
    width: r.readUInt32(),
    pitchOrLinearSize: r.readUInt32(),
    depth: r.readUInt32(),
    mipMapCount: r.readUInt32(),
    reserved: r.readUInt32Array(11),
    pixelFormat: {
      size: r.readUInt32(),
      flags: r.readUInt32(),
      fourCC: r.readString(4),
      rgbBitCount: r.readUInt32(),
      rBitMask: r.readUInt32(),
      gBitMask: r.readUInt32(),
      bBitMask: r.readUInt32(),
      aBitMask: r.readUInt32(),
    },
    caps: r.readUInt32(),
    caps2: r.readUInt32(),
    caps3: r.readUInt32(),
    caps4: r.readUInt32(),
    reserved6: r.readUInt32(),
  }
}
