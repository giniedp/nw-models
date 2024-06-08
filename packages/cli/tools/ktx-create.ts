import cp from 'child_process'
import fs from 'node:fs'
import { logger, spawn } from '../utils'

export async function ktxCreate(options: { exe?: string; input: string | Buffer; output: string; args: string[] }) {
  // https://github.com/new-world-tools/new-world-tools
  const cmd = options.exe || 'ktx'
  const args = [...options.args]
  args.unshift('create')
  // const cmd = 'echo'
  // const args = ['hello world']
  const codes: Record<number, string> = {
    0: 'Success',
    1: 'Command line error',
    2: 'IO failure',
    3: 'Invalid input file',
    4: 'Runtime or library error',
    5: 'Not supported state or operation',
    6: 'Requested feature is not yet implemented',
  }
  const input = options.input

  if (typeof input === 'string') {
    args.push(input)
    args.push(options.output)

    return await spawn(cmd, args, {
      shell: true,
      stdio: logger.isVerbose ? 'inherit' : null,
    }).catch((code: number) => {
      throw codes[code] || code
    })
  }

  args.push('-') // input from stdin
  args.push('-') // output to stdout
  return await new Promise<Buffer>((resolve, reject) => {
    logger.activity('spawn', cmd, ...args)

    const p = cp.spawn(cmd, args, {
      shell: true,
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    const output: Buffer[] = []
    const response: Buffer[] = []

    p.stdout.on('data', (data) => {
      output.push(data)
    })

    p.on('data', (data) => {
      response.push(data)
    })

    p.on('error', (data) => {
      logger.error(data)
    })

    p.on('close', (code) => {
      if (code) {
        reject(codes[code] || code)
      } else {
        resolve(Buffer.concat(output))
      }
    })

    p.stdin.end(input)
  }).then((data) => {
    if (options.output) {
      fs.writeFileSync(options.output, data)
    }
    return data
  })
}
