import { mat4 } from '@gltf-transform/core'
import path from 'node:path'
import { AssetNode, CameraAssetNode, LightAssetNode, MeshAssetNode } from 'types'
import { readEntitiesXml, scanObjectStreamDocument } from '../file-formats/entities_xml'
import { loadLevel } from '../file-formats/level/loader'
import { glob, logger } from '../utils'
import { AssetCollector } from './collector'

export interface CollectLevelOptions {
  filter: (level: string) => boolean
}

export async function collectLevel(collector: AssetCollector, options: CollectLevelOptions) {
  const catalog = collector.catalog
  const inputDir = collector.inputDir

  const levels = await glob(path.join(inputDir, 'levels', '**', 'levelinfo.xml')).then((files) => {
    return files.map((file) => path.dirname(path.relative(inputDir, file)).replace(/\\/g, '/'))
  })
  for (const levelDir of levels) {
    if (!options.filter(levelDir)) {
      continue
    }
    const level = await loadLevel({ inputDir, levelDir })
    const mission = level.levelDataAction?.Missions.Mission[0] // nw has only one mission object per map
    if (!mission) {
      continue
    }
    logger.info(`Collecting level: ${levelDir}`)
    const missionEntityFile = path.resolve(inputDir, levelDir, mission.Name + '.entities_xml')

    const meshes: MeshAssetNode[] = []
    const lights: LightAssetNode[] = []
    const cameras: CameraAssetNode[] = []
    const entities: AssetNode[] = []
    const xmlDoc = await readEntitiesXml(missionEntityFile)
    // debugObjectStream(xmlDoc)
    scanObjectStreamDocument(xmlDoc, {
      onModel: (node) => {
        if (!node.model) {
          return
        }
        if (path.extname(node.model) !== '.cgf') {
          logger.warn(`Skipping non-cgf model: ${node.model}`)
          return
        }
        meshes.push({
          transform: node.transform as mat4,
          model: node.model,
          material: node.material,
          ignoreSkin: true,
          ignoreGeometry: false,
        })
      },
      onLight: (light) => {
        lights.push(light)
      },
      onCamera: (camera) => {
        cameras.push(camera)
      },
      onEntity: (node) => {
        if (node.name === 'Player Entity') {
          entities.push(node)
        }
      },
    })

    await collector.collect({
      meshes: meshes,
      lights: lights,
      cameras: cameras,
      entities: entities,
      outFile: levelDir,
    })
  }
}
