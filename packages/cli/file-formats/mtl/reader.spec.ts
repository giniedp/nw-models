import assert from 'assert/strict'
import { describe, it } from 'node:test'
import { loadMtlFile } from './reader'

describe('.mtl file format', () => {
  it('parse', async () => {
    const mtl = await loadMtlFile(`sample/male_alchemist_chest_matgroup.mtl`, {
      catalog: {},
      inputDir: __dirname,
    })
    assert.equal(mtl.length, 1)
  })
})
