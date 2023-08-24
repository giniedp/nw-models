import assert from 'assert/strict'
import { describe, it } from 'node:test'
import { readMtlFile } from './reader'

describe('.mtl file format', () => {
  it('parse', async () => {
    const mtl = await readMtlFile(`${__dirname}/sample/male_alchemist_chest_matgroup.mtl`)
    assert.equal(mtl.length, 1)
    assert.equal(mtl[0].textures.length, 5)
  })
})
