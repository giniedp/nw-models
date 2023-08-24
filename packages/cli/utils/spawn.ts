import * as cp from 'child_process'
import { Worker } from 'worker_threads'
import { logger } from './logger'


export async function spawn(cmd: string, args?: string[], options?: cp.SpawnOptions) {
  logger.activity('spawn', cmd, ...args)
  return new Promise<void>((resolve, reject) => {
    const p = cp.spawn(cmd, args, options)
    p.on('close', (code) => {
      if (code) {
        reject(code)
      } else {
        resolve()
      }
    })
  })
}

export async function spawnWorker(script: string, data: any) {
  logger.activity('worker', script)
  return new Promise((resolve, reject) => {
    const workerScript = './src/lib/worker.js'
    const worker = new Worker(workerScript, {
      workerData: {
        aliasModule: script,
        args: data,
      },
    })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}
