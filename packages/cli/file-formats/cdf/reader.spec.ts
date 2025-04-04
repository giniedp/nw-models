import fs from 'node:fs'
import path from 'node:path'
import assert from 'assert/strict'
import { describe, it } from 'node:test'
import { readCDF } from './reader'

describe('.cdf file format', () => {
  const sampleDir = path.join(__dirname, 'sample')
  const tmpDir = path.join(__dirname, 'tmp')
  const sampleFile = 'male_leather_seta_t5.cdf'

  describe('readCdf', () => {
    it(sampleFile, async () => {
      const cdf = await readCDF(path.join(sampleDir, sampleFile))
      assert.deepEqual(cdf.Model, { File: 'objects/characters/player/male/player_male.chr'})
      assert.equal((cdf.AttachmentList.Attachment as Array<any>).length, 18)
    })
  })
})
