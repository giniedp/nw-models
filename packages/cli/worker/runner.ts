import path from 'node:path'
import workerpool from 'workerpool'
import { logger } from '../utils/logger'
import { useProgressBar, withProgressBar } from '../utils/progress'
import { TaskArgs, TaskName, WORKER_TASKS } from './tasks'

export interface RunTasksOptions<K extends TaskName> {
  label?: string
  threads?: number
  taskName: K
  tasks: Array<TaskArgs<K>>
}

export async function runTasks<K extends TaskName>(options: RunTasksOptions<K>) {
  if (options.threads > 1) {
    return runThreaded(options)
  }
  return runSerial(options)
}

async function runSerial<K extends TaskName>({ label, taskName, tasks }: RunTasksOptions<K>) {
  await withProgressBar({ name: label, tasks }, async (args) => {
    await WORKER_TASKS[taskName](args as any).catch((err) => logger.error(err))
  })
}

function runThreaded<K extends TaskName>({ label, threads, taskName, tasks }: RunTasksOptions<K>) {
  const limit = tasks.length
  let count = 0

  return useProgressBar(label, async (bar) => {
    const runner = workerpool.pool(path.join(__dirname, 'worker.js'), {
      maxWorkers: threads,
      workerType: 'thread',
      emitStdStreams: true,
    })

    bar.start(limit, 0, { log: '' })
    return new Promise<void>((resolve) => {
      if (!tasks.length) {
        bar.stop()
        runner.terminate()
        resolve()
      }
      for (const args of tasks) {
        runner
          .exec(taskName, [args], {
            on: (payload) => {
              if (payload.stdout) {
                logger.log(payload.stdout)
              }
              if (payload.stderr) {
                logger.error(payload.stderr)
              }
            }
          })
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
  })
}
