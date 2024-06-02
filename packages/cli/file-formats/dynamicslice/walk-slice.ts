import { mat4 } from '@gltf-transform/core'
import fs from 'node:fs'
import { logger, readJSONFile } from '../../utils'
import { mat4Identity, mat4Multiply } from '../gltf/utils/math'
import { AZ__Entity, isAZ__Entity, isGameTransformComponent, isSliceComponent } from './types'
import { getTransformMatrix } from './utils'

export interface EntryContext {
  file: string
  catalog: Record<string, string>
}

export interface WalkEntry {
  file: string
  fileEntities: AZ__Entity[]
  entity: AZ__Entity
  // transform: mat4
}

export type WalkCallback = (entry: WalkEntry, transform: mat4, add: (file: string) => void) => Promise<void>

export async function walkSlice(file: string, cb: WalkCallback, transform: mat4 = mat4Identity()) {
  // logger.debug('walk slice', file)
  if (!fs.existsSync(file)) {
    logger.warn('file not found', file)
    return
  }
  const slice = await readJSONFile(file)
  if (!isAZ__Entity(slice)) {
    return
  }

  const files: Array<{ file: string; transform: mat4 }> = []
  function pushFile(file: string, transform: mat4) {
    files.push({ file, transform })
  }

  const sliceComponent = slice.components?.find(isSliceComponent)
  // plotGraph(sliceComponent?.entities || [])
  const rootEntities = getRootEntities(sliceComponent.entities)
  for (const entity of rootEntities) {
    await walkEntity(
      {
        file,
        fileEntities: sliceComponent.entities,
        entity,
        // transform,
      },
      async (entry) => {
        return cb(entry, mat4Multiply(transform, getTransform(entry.entity)), (file) => {
          pushFile(file, mat4Multiply(transform, getTransform(entry.entity)))
        })
      },
    )
  }

  for (const it of files) {
    await walkSlice(it.file, cb, it.transform)
  }
}

function plotGraph(entities: AZ__Entity[]) {
  const roots = getRootEntities(entities)
  for (const root of roots) {
    plotBranch(root, entities)
  }
}

function plotBranch(entity: AZ__Entity, entities: AZ__Entity[], depth = 0) {
  const log: any[] = []

  if (depth > 0) {
    log.push(' '.repeat(depth * 2) + '|-')
  }
  log.push(entity.id, entity.name)
  // const transform = entity.components.find(isGameTransformComponent)
  // if (transform) {
  //   log.push(transform.m_isstatic ? 'static' : 'dynamic')
  //   log.push(transform.m_onnewparentkeepworldtm ? 'keep' : 'inherit')
  //   //log.push(getTransformMatrix(transform))
  // }

  console.log(...log)
  // for (const comp of entity.components) {
  //   console.log(' '.repeat(depth * 2), '  ', comp.__type)
  // }

  const children = getChildEntities(entity.id, entities)
  for (const child of children) {
    plotBranch(child, entities, depth + 1)
  }
}

function getRootEntities(entities: AZ__Entity[]) {
  return entities.filter((entity) => {
    const transform = entity.components.find(isGameTransformComponent)
    if (!transform) {
      return true
    }
    const parent = getEntityById(transform.m_parentid, entities)
    if (!parent) {
      return true
    }
    return false
  })
}

function getChildEntities(parent: number, entities: AZ__Entity[]) {
  return entities.filter((entity) => {
    const transform = entity.components.find(isGameTransformComponent)
    if (!transform) {
      return false
    }
    return transform.m_parentid === parent
  })
}

function getEntityById(id: number, entities: AZ__Entity[]) {
  return entities.find((entity) => entity.id === id)
}

async function walkEntity(entry: WalkEntry, cb: WalkCallback) {
  await cb(entry, null, null)
  for (const child of getChildEntities(entry.entity.id, entry.fileEntities)) {
    await walkEntity(
      {
        ...entry,
        entity: child,
        //transform: mat4Multiply(entry.transform, getTransform(child)),
      },
      cb,
    )
  }
}

function getTransform(entity: AZ__Entity) {
  const transform = entity.components.find(isGameTransformComponent)
  if (!transform) {
    return mat4Identity()
  }
  return getTransformMatrix(transform)
}
