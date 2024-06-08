import { Bar, MultiBar, Presets } from 'cli-progress'
import { logger } from './logger'

function makeBarName(name: string, limit: number = 25) {
  name = name || ''
  if (name) {
    while (name.length < limit) {
      name = ' ' + name
    }
    name = name.substring(0, limit) + ' '
  }
  return name
}

let multiBar: MultiBar
export async function useProgressBar<T>(barName: string, fn: (bar: Bar) => Promise<T>) {
  const isRoot = !multiBar
  if (!multiBar) {
    const bars = new MultiBar(
      {
        format: `${makeBarName(barName, 20)}{bar} | {value}/{total} {percentage}% | {duration_formatted} ETA:{eta_formatted} {log}`,
        clearOnComplete: false,
        hideCursor: true,
        etaBuffer: 1000,
        forceRedraw: true,
        linewrap: true,
        fps: 60,
      },
      Presets.shades_grey,
    )
    logger.redirect((...msg) => {
      bars.log(msg.join(' ') + '\n')
      bars.update()
    })
    multiBar = bars
  }

  const bar = multiBar.create(100, 0)
  bar.update({ log: '' })
  const result = await fn(bar)
  bar.stop()
  if (!isRoot) {
    multiBar.remove(bar)
  } else {
    multiBar.stop()
    logger.redirect(null)
    multiBar = null
  }
  return result
}

export async function withProgressBar<T>(
  {
    name,
    tasks,
  }: {
    name?: string
    tasks: T[]
  },
  task: (input: T, index: number, log: (message: string) => void) => Promise<void>,
) {
  await useProgressBar(name, async (bar) => {
    bar.start(tasks.length, 0, { log: '' })
    function log(log: string) {
      bar.update({ log })
    }
    for (let i = 0; i < tasks.length; i++) {
      await task(tasks[i], i, log).catch(logger.error)
      bar.update(i + 1)
    }
    log('')
  })
}
