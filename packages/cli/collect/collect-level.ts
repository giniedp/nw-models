import * as path from 'path'
import { loadLevel } from '../file-formats/level/loader'
import { glob, logger } from '../utils'
import { AssetCollector } from './collector'
import { getModelsFromObjectStream, readEntitiesXml } from '../file-formats/entities_xml'
import { ModelMeshAsset } from 'types'
import { mat4 } from '@gltf-transform/core'

export interface CollectLevelOptions {
  filter: (level: string) => boolean
}

export async function collectLevel(collector: AssetCollector, options: CollectLevelOptions) {
  const catalog = collector.catalog
  const inputDir = collector.inputDir

  const levels = await glob(path.join(inputDir, 'levels', '*'), {
    onlyDirectories: true,
  }).then((files) => {
    return files.map((file) => path.relative(inputDir, file))
  })
  for (const levelDir of levels) {
    if (!options.filter(levelDir)) {
      continue
    }
    const level = await loadLevel({ inputDir, levelDir })
    const mission = level.levelDataAction?.Missions.Mission[0] // nw has only one mission object per map
    if (!mission) {
      // logger.warn(`Skipping level without mission: ${levelDir}`)
      continue
    }
    logger.info(`Collecting level: ${levelDir}`)
    const missionEntityFile = path.resolve(inputDir, levelDir, mission.Name + '.entities_xml')
    // if (!level.terrainFile) {
    //   logger.warn(`Skipping level without terrain: ${levelDir}`)
    //   continue
    // }

    const result: ModelMeshAsset[] = []
    const xmlDoc = await readEntitiesXml(missionEntityFile)
    getModelsFromObjectStream(xmlDoc, (node) => {
      if (!node.model) {
        return
      }
      if (path.extname(node.model) !== '.cgf') {
        logger.warn(`Skipping non-cgf model: ${node.model}`)
        return
      }
      result.push({
        transform: node.transform as mat4,
        model: node.model,
        material: node.material,
        ignoreSkin: true,
        ignoreGeometry: false,
      })
    })

    await collector.collect({
      animations: null,
      appearance: null,
      meshes: result,
      outFile: levelDir,
    })
  }
}
