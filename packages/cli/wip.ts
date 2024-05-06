import { readCgf } from './file-formats/cgf'
import { readChunk } from './file-formats/cgf/chunks'
import { cgfToGltf } from './file-formats/cgf/converter/gltf'

import path from 'node:path'
import { writeFile } from './utils'
import { loadMtlFile, readMtlFile } from 'file-formats/mtl'

async function run() {
  const animFiles = [
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_aim_idle.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_aim_idle_to_idle.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_attack_turn_l.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_attack_turn_r.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_blastback.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_fire.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_fire_tell.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_rain_fire.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_rain_intro.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_slam_01.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_cannon_swipe.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_charge_attack_run.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_charge_attack_start.caf',
    'animations/gameplay/character/npc/supernatural/piratebrute/combat/pirate_brute_idle_to_aim_idle.caf',
  ].map((it) => `E:/Projects/nw-data/live/${it}`)

  const modelFile = 'E:/Projects/nw-data/live/objects/characters/npc/supernatural/admiralbrute/admiralbrute.skin'
  const mtlFile = 'E:/Projects/nw-data/ptr/objects/characters/npc/supernatural/admiralbrute/admiralbrute.mtl'

  const model = await readCgf(modelFile, true)
  const material = await loadMtlFile(mtlFile)
  const animations = await Promise.all(animFiles.map((it) => readCgf(it, true)))// await readCgf(animFile, true)

  const gltf = await cgfToGltf({ model, material, animations })

  writeFile(path.join('tmp', 'admiralbrute.gltf'), JSON.stringify(gltf, null, 2), {
    createDir: true,
    encoding: 'utf-8',
  })
}

run()
