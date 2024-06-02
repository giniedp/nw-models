import { describe, it } from 'node:test'
import path from 'node:path'
import { readTerrainDataFile } from './reader'

describe('terrain .dat file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const sampleFile = 'terrain.dat'

  describe('readTerrainDatFile', () => {
    it(sampleFile, async () => {
      // const result = await readTerrainDataFile(path.join(sampleDir, sampleFile))
      // for (const chunk of result.chunks) {
      //   console.log(chunk.header)
      // }
    })
  })
})
