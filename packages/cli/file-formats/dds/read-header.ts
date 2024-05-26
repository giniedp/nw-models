import { BinaryReader } from "../cgf/binary-reader";
import fs from 'node:fs/promises';

export async function readDdsHeader(file: string) {
  const data = await fs.readFile(file)
  const r = new BinaryReader(data.buffer as any)
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
