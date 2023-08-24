import { processModel, preprocessModel, copyMaterial } from './process-model'
import { processTexture } from './process-texture'

export const WORKER_TASKS = {
  processModel,
  processTexture,
  copyMaterial,
  preprocessModel,
} as const

export type WorkerTasks = typeof WORKER_TASKS
export type TaskName = keyof WorkerTasks
export type TaskArgs<T extends TaskName> = Parameters<WorkerTasks[T]>[0]
