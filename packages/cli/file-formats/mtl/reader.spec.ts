import assert from 'assert/strict'
import { describe, it } from 'node:test'
import { loadMtlFile } from './reader'

describe('.mtl file format', () => {
  it('parse', async () => {
    const mtl = await loadMtlFile(`${__dirname}/sample/male_alchemist_chest_matgroup.mtl`)
    assert.equal(mtl.length, 1)
  })
})
