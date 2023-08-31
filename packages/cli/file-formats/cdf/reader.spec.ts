import * as fs from 'fs'
import * as path from 'path'
import assert from 'assert/strict'
import { describe, it } from 'node:test'
import { readCdf } from './reader'

describe('.cdf file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const tmpDir = path.join(__dirname, 'tmp')
  const sampleFile = 'male_leather_seta_t5.cdf'

  describe('readCdf', () => {
    it(sampleFile, async () => {
      const cdf = await readCdf(path.join(sampleDir, sampleFile))
      assert.deepEqual(cdf.Model, { File: 'objects/characters/player/male/player_male.chr'})
      assert.equal((cdf.AttachmentList.Attachment as Array<any>).length, 18)
    })
  })
})
