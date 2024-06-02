import path from 'node:path'
import { describe, it } from 'node:test'
import { readEntitiesXml, scanObjectStreamDocument } from './reader'

describe('.entities_xml file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const sampleFile = 'sample.entities_xml'

  describe('readEntitiesXml', () => {
    it(sampleFile, async () => {
      const result = await readEntitiesXml(path.join(sampleDir, sampleFile))
      scanObjectStreamDocument(result, {
        onModel: (node) => {
          //console.log(node)
        },
        onLight: (node) => {
          //console.log(node)
        },
        onCamera: (node) => {
          //console.log(node)
        },
        onEntity: (node) => {
          //console.log(node)
        },
      })
    })
  })
})
