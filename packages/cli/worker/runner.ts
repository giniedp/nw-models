import { Presets, SingleBar } from 'cli-progress'
import * as path from 'path'
import { logger } from '../utils'
import workerpool from 'workerpool'
import { TaskArgs, TaskName, WORKER_TASKS } from './tasks'

export interface RunTasksOptions<K extends TaskName> {
  threads?: number
  taskName: K
  tasks: Array<TaskArgs<K>>
}

export async function runTasks<K extends TaskName>(options: RunTasksOptions<K>) {
  if (options.threads) {
    return runThreaded(options)
  }
  return runSerial(options)
}

async function runSerial<K extends TaskName>({ taskName, tasks }: RunTasksOptions<K>) {
  for (const args of tasks) {
    await WORKER_TASKS[taskName](args as any).catch((err) => logger.error(err))
  }
}

function runThreaded<K extends TaskName>({ threads, taskName, tasks }: RunTasksOptions<K>) {
  const limit = tasks.length
  let count = 0

  const bar = new SingleBar({}, Presets.shades_classic)
  const runner = workerpool.pool(path.join(__dirname, 'worker.js'), {
    maxWorkers: threads,
    workerType: 'thread',
  })

  bar.start(limit, 0)
  return new Promise<void>((resolve) => {
    if (!tasks.length) {
      bar.stop()
      runner.terminate()
      resolve()
    }
    for (const args of tasks) {
      runner
        .exec(taskName, [args])
        .catch((err) => logger.error(err))
        .then(() => {
          count += 1
          bar.increment()
          if (count >= limit) {
            bar.stop()
            runner.terminate()
            resolve()
          }
        })
    }
  })
}
