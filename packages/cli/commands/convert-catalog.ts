import 'colors'
import { program } from 'commander'
import * as fs from 'fs'
import * as path from 'path'

import { CONVERT_DIR, UNPACK_DIR } from '../env'
import { BinaryReader } from '../file-formats/cgf/binary-reader'
import { logger, writeFile } from '../utils'

program
  .command('convert-catalog')
  .description('Converts asset catalog')
  .requiredOption('-i, --input [dataDir]', 'Path to the unpacked game data directory', UNPACK_DIR)
  .requiredOption('-o, --output [outDir]', 'Path to the converted game data directory', CONVERT_DIR)
  .action(async (options) => {
    logger.verbose(true)
    logger.debug('convert-asset-catalog', JSON.stringify(options, null, 2))

    const inputFile = path.join(options.input, 'assetcatalog.catalog')
    const ouputFile = path.join(options.output, 'assetcatalog.catalog.json')
    const catalog = await convertAssetCatalog(inputFile)
    await writeFile(ouputFile, JSON.stringify(catalog, null, 2), {
      createDir: true,
      encoding: 'utf-8',
    })
  })

async function convertAssetCatalog(file: string) {
  const data = await fs.promises.readFile(file)
  const reader = new BinaryReader(data.buffer)

  const signature = reader.readString(4)
  const version = reader.readUInt32()
  const fileSize = reader.readUInt32()
  const field4 = reader.readUInt32()

  const posBlockUUID = reader.readUInt32() // UUID block
  const posBlockType = reader.readUInt32() // Type block
  const posBlockDirs = reader.readUInt32() // Dir block
  const posBlockFile = reader.readUInt32() // File block
  const fileSize2 = reader.readUInt32()
  const posBlock0 = reader.position

  const assetInfoRefs: Array<{
    uuidIndex1: number
    subId1: number
    uuidIndex2: number
    subId2: number
    typeIndex: number
    field6: number
    fileSize: number
    field8: number
    dirOffset: number
    fileOffset: number
  }> = []
  const assetPathRefs: Array<{
    uuidIndex: number
    guidIndex: number
    subId: number
  }> = []
  const legacyAssetRefs: Array<{
    legacyGuidIndex: number
    legacySubId: number
    guidIndex: number
    subId: number
  }> = []

  reader.seekAbsolute(posBlock0)

  const count1 = reader.readUInt32()
  for (let i = 0; i < count1; i++) {
    assetInfoRefs.push({
      uuidIndex1: reader.readUInt32(),
      subId1: reader.readUInt32(),
      uuidIndex2: reader.readUInt32(),
      subId2: reader.readUInt32(),
      typeIndex: reader.readUInt32(),
      field6: reader.readUInt32(),
      fileSize: reader.readUInt32(),
      field8: reader.readUInt32(),
      dirOffset: reader.readUInt32(),
      fileOffset: reader.readUInt32(),
    })
  }

  const assetInfos = assetInfoRefs.map((info) => {
    reader.seekAbsolute(posBlockUUID + 16 * info.uuidIndex2)
    const assetId = readUUID(reader)

    reader.seekAbsolute(posBlockUUID + 16 * info.typeIndex)
    const type = readUUID(reader)

    reader.seekAbsolute(posBlockDirs + info.dirOffset)
    const dir = reader.readStringNT()

    reader.seekAbsolute(posBlockFile + info.fileOffset)
    const file = reader.readStringNT()

    return {
      assetId,
      type,
      dir,
      file,
    }
  })

  const assetDict = assetInfos.reduce((dict, it) => {
    dict[it.assetId] = path.join(it.dir, it.file).replace(/\\/g, '/')
    return dict
  }, {} as Record<string, string>)

  return assetDict
}

function readUUID(r: BinaryReader) {
  return r
    .readBytes(16)
    .map((it): string => {
      return it.toString(16).padStart(2, '0')
    })
    .join('')
}
