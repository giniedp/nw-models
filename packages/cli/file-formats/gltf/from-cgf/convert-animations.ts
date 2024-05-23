import type { Document } from '@gltf-transform/core'
import path from 'path'
import { CgfFile, readCgf } from '../../../file-formats/cgf'
import { ModelAnimation } from '../../../types'
import { logger } from '../../../utils/logger'
import { isChunkController, isChunkMotionParams } from '../../cgf/chunks'
import { getNodeExtraField, setNodeExtraField } from '../utils/annotation'
import { cryToGltfQuatTypedArray, cryToGltfVec3TypedArray } from '../utils/math'

export async function convertAnimations({
  gltf,
  animations,
}: {
  gltf: Document
  animations: Array<string | ModelAnimation>
}): Promise<void> {
  if (!animations?.length) {
    return null
  }

  for (const it of animations) {
    const animation = await getAnimation(it)
    if (!animation) {
      continue
    }
    let name = path.basename(animation.file, path.extname(animation.file))
    if (typeof it !== 'string') {
      name = it.name || name
    }
    const controllers = animation.chunks.filter(isChunkController)
    const params = animation.chunks.find(isChunkMotionParams)
    const gltfAnim = gltf.createAnimation(name)

    for (const controller of controllers) {
      const targetNode = gltf
        .getRoot()
        .listNodes()
        .find((it) => getNodeExtraField(it, 'controllerId') === controller.controllerId)

      if (!targetNode) {
        // logger.warn('Node not found for controllerId', controller.controllerId)
        continue
      }
      if (controller.rotationKeys.length) {
        const rotTimeKeys = new Float32Array(controller.rotationTimeKeys)
        if (params && params.ticksPerFrame && params.secsPerTick) {
          for (let i = 0; i < rotTimeKeys.length; i++) {
            rotTimeKeys[i] = (rotTimeKeys[i] * params.secsPerTick) / params.ticksPerFrame
          }
        }
        const rotTimeAccessor = gltf.createAccessor('rotationTime')
        rotTimeAccessor.setType('SCALAR')
        rotTimeAccessor.setArray(rotTimeKeys)

        const rotationKeys = new Float32Array(controller.rotationKeys.flat())
        cryToGltfQuatTypedArray(rotationKeys)
        const rotAccessor = gltf.createAccessor('rotation')
        rotAccessor.setType('VEC4')
        rotAccessor.setArray(rotationKeys)
        const rotSampler = gltf.createAnimationSampler()
        rotSampler.setInput(rotTimeAccessor)
        rotSampler.setOutput(rotAccessor)
        rotSampler.setInterpolation('LINEAR')

        const channel = gltf.createAnimationChannel()
        channel.setTargetNode(targetNode)
        channel.setTargetPath('rotation')
        channel.setSampler(rotSampler)
        setNodeExtraField(channel, 'controllerId', controller.controllerId)

        gltfAnim.addChannel(channel)
        gltfAnim.addSampler(rotSampler)
      }

      if (controller.positionKeys.length) {
        const posTimeKeys = new Float32Array(controller.positionTimeKeys)
        if (params && params.ticksPerFrame && params.secsPerTick) {
          for (let i = 0; i < posTimeKeys.length; i++) {
            posTimeKeys[i] = (posTimeKeys[i] * params.secsPerTick) / params.ticksPerFrame
          }
        }

        const posTimeAccessor = gltf.createAccessor('positionTime')
        posTimeAccessor.setType('SCALAR')
        posTimeAccessor.setArray(posTimeKeys)

        const positionKeys = new Float32Array(controller.positionKeys.flat())
        cryToGltfVec3TypedArray(positionKeys)
        const posAccessor = gltf.createAccessor('position')
        posAccessor.setType('VEC3')
        posAccessor.setArray(positionKeys)

        const posSampler = gltf.createAnimationSampler()
        posSampler.setInput(posTimeAccessor)
        posSampler.setOutput(posAccessor)
        posSampler.setInterpolation('LINEAR')

        const channel = gltf.createAnimationChannel()
        channel.setTargetNode(targetNode)
        channel.setTargetPath('translation')
        channel.setSampler(posSampler)
        setNodeExtraField(channel, 'controllerId', controller.controllerId)

        gltfAnim.addChannel(channel)
        gltfAnim.addSampler(posSampler)
      }
    }
  }
}

async function getAnimation(anim: string | ModelAnimation): Promise<CgfFile> {
  let file = anim
  if (anim && typeof anim !== 'string') {
    file = anim.file
  }
  if (typeof file === 'string') {
    return readCgf(file, true).catch(() => {
      logger.error('Failed to read', file)
      return null
    })
  }
  return null
}
