import { describe, it } from 'bun:test'
import * as path from 'path'
import { readTerrainDataFile } from './reader'

describe('terrain .dat file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const sampleFile = 'terrain.dat'

  describe('readTerrainDatFile', () => {
    it(sampleFile, async () => {
      const result = await readTerrainDataFile(path.join(sampleDir, sampleFile))
      console.log(result.header)
      console.log(result.chunks[0].header)
      console.log(result.chunks[1].header)
      console.log(result.chunks[2].header)
      console.log(result.chunks[3].header)
      console.log(result.chunks[4].header)
      // for (const chunk of result.chunks) {
      //   console.log(chunk.header)
      // }
    })
  })
})
