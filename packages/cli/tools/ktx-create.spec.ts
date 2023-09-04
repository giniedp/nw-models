import * as fs from 'fs'
import * as path from 'path'
import assert from 'assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { ktxCreate } from './ktx-create'
import { replaceExtname } from 'utils'

describe('tools / ktx create', () => {

  const sampleDir = path.join(__dirname, 'sample')
  const tmpDir = path.join(__dirname, 'tmp')
  const DIFF = 'male_masterofceremonies_diff.png'

  describe('create file to file', () => {
    it(DIFF, async () => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      const input = path.join(sampleDir, DIFF)
      const output = path.join(tmpDir, replaceExtname(DIFF, '.ktx'))

      assert.equal(fs.existsSync(input), true)
      //assert.equal(fs.existsSync(output), false)

      const res = await ktxCreate({
        format: 'R8G8B8_UNORM',
        input: input,
        output: output,
      }).then(() => 'ok').catch((err) => err)

      assert.equal(res, 'ok')
      assert.equal(fs.existsSync(input), true)
      assert.equal(fs.existsSync(output), true)
    })
  })

  // describe('create stdin to stdout', () => {
  //   it(DIFF, async () => {
  //     fs.rmSync(tmpDir, { recursive: true, force: true })
  //     const input = fs.readFileSync(path.join(sampleDir, DIFF))

  //     const res = await ktxCreate({
  //       format: 'R8G8B8_UNORM',
  //       input: fs.createReadStream(input),
  //     }).catch((err) => err)

  //     assert.equal(Buffer.isBuffer(res), true)
  //   })
  // })

})
