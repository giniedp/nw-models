import * as fs from 'fs'
import * as path from 'path'
import { readLevelDataFile } from './level-data'
import { readLevelDataActionFile } from './level-data-actions'
import { readLevelInfoFile } from './level-info'

export async function loadLevel({ inputDir, levelDir }: { inputDir: string; levelDir: string }) {
  levelDir = path.resolve(inputDir, levelDir)
  const levelInfo = await loadLevelInfo(path.resolve(levelDir, 'levelinfo.xml'))
  const levelData = await loadLevelData(path.resolve(levelDir, 'leveldata.xml'))
  const levelDataAction = await loadLevelDataAction(path.resolve(levelDir, 'leveldataaction.xml'))

  const terrainFile = path.resolve(levelDir, 'terrain', 'terrain.dat')
  const terrainFileExists = fs.existsSync(terrainFile)
  return {
    levelInfo,
    levelData,
    levelDataAction,
    terrainFile: terrainFileExists ? terrainFile : null,
  }
}

function loadLevelInfo(file: string) {
  if (!fs.existsSync(file)) {
    return null
  }
  return readLevelInfoFile(file).then((data) => data.LevelInfo)
}

function loadLevelData(file: string) {
  if (!fs.existsSync(file)) {
    return null
  }
  return readLevelDataFile(file).then((data) => data.LevelData)
}

function loadLevelDataAction(file: string) {
  if (!fs.existsSync(file)) {
    return null
  }
  return readLevelDataActionFile(file).then((data) => data.LevelDataAction)
}
