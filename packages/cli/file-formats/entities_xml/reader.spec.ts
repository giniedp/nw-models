import { describe, it } from 'node:test'
import path from 'node:path'
import { getModelsFromObjectStream, readEntitiesXml } from './reader'

describe('.entities_xml file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const sampleFile = 'sample.entities_xml'

  describe('readEntitiesXml', () => {
    it(sampleFile, async () => {
      const result = await readEntitiesXml(path.join(sampleDir, sampleFile))
      getModelsFromObjectStream(result, console.log)
    })
  })
})
