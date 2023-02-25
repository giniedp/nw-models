import { Presets, SingleBar } from 'cli-progress'
import * as path from 'path'
import { logger } from '../utils'
import workerpool from 'workerpool'
import { TaskArgs, TaskName, WORKER_TASKS } from './tasks'

export interface RunTasksOptions<K extends TaskName> {
  threads?: number
  taskName: K,
  tasks: Array<TaskArgs<K>>,
}

export async function runTasks<K extends TaskName>({ threads, taskName, tasks }: RunTasksOptions<K>) {
  const runner = getRunner(threads)
  let count = 0
  const limit = tasks.length

  const bar = threads ? new SingleBar({}, Presets.shades_classic) : null
  bar?.start(limit, 0)

  return new Promise<void>(async (resolve) => {
    for (const args of tasks) {
      await runner
        .exec(taskName, [args])
        .catch((err) => logger.error(err))
        .then(() => {
          count += 1
          bar?.increment()
          if (count >= limit) {
            bar?.stop()
            runner.terminate()
            resolve()
          }
        })
    }
  })
}

interface Runner {
  exec: (name: string, tasks: any[]) => Promise<void>
  terminate: () => void
}

function getRunner(threads: number) {
  if (threads > 0) {
    return getThreadRunner(threads)
  }
  return getSerialRunner()
}

function getThreadRunner(numWorkers: number): Runner {
  const pool = workerpool.pool(path.join(__dirname, 'worker.js'), {
    maxWorkers: numWorkers,
    workerType: 'thread',
  })
  return {
    exec: async (key, args) => pool.exec(key, args),
    terminate: () => pool.terminate()
  }
}

function getSerialRunner(): Runner {
  return {
    exec: async (key, args) => WORKER_TASKS[key](...args),
    terminate: () => {
      // noop
    }
  }
}
