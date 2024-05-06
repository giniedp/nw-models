import type { Document, Transform } from '@gltf-transform/core'
import { createTransform } from '@gltf-transform/functions'
import path from 'path'
import { ChunkController, ChunkMotionParams, isChunkController, isChunkMotionParams } from '../chunks'
import { readCgf, type CgfFile } from '../reader'
import { getNodeExtraField, setNodeExtraField, typedRotationsToGltfSpace, typedVectorsToGltfSpace } from './utils'

const NAME = 'attach-animations'
export function attachAnimations(options: { animations: string[] }): Transform {
  return createTransform(NAME, async (doc: Document): Promise<void> => {
    const animations: CgfFile[] = []
    for (const file of options.animations || []) {
      const animation = await readCgf(file, true).catch((e) => {
        console.error('Failed to read', file, e)
        return null
      })
      if (animation) {
        animations.push(animation)
      }
    }
    convertAnimations({ gltf: doc, animations })
  })
}
export function convertAnimations({ gltf, animations }: { gltf: Document; animations: CgfFile[] }): void {
  if (!animations?.length) {
    return null
  }

  for (const animation of animations) {
    const name = path.basename(animation.file, path.extname(animation.file))
    const controllers = animation.chunks.filter((it) => isChunkController(it)) as ChunkController[]
    const params = animation.chunks.find((it) => isChunkMotionParams(it)) as ChunkMotionParams
    const gltfAnim = gltf.createAnimation(name)

    for (const controller of controllers) {
      const node = gltf
        .getRoot()
        .listNodes()
        .find((it) => getNodeExtraField(it, 'controllerId') === controller.controllerId)

      if (!node) {
        console.warn('Node not found for controllerId', controller.controllerId)
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
        typedRotationsToGltfSpace(rotationKeys)
        const rotAccessor = gltf.createAccessor('rotation')
        rotAccessor.setType('VEC4')
        rotAccessor.setArray(rotationKeys)
        const rotSampler = gltf.createAnimationSampler()
        rotSampler.setInput(rotTimeAccessor)
        rotSampler.setOutput(rotAccessor)
        rotSampler.setInterpolation('LINEAR')

        const channel = gltf.createAnimationChannel()
        channel.setTargetNode(node)
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
        typedVectorsToGltfSpace(positionKeys)
        const posAccessor = gltf.createAccessor('position')
        posAccessor.setType('VEC3')
        posAccessor.setArray(positionKeys)

        const posSampler = gltf.createAnimationSampler()
        posSampler.setInput(posTimeAccessor)
        posSampler.setOutput(posAccessor)
        posSampler.setInterpolation('LINEAR')

        const channel = gltf.createAnimationChannel()
        channel.setTargetNode(node)
        channel.setTargetPath('translation')
        channel.setSampler(posSampler)
        setNodeExtraField(channel, 'controllerId', controller.controllerId)

        gltfAnim.addChannel(channel)
        gltfAnim.addSampler(posSampler)
      }
    }
  }
}
