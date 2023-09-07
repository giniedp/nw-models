import * as fs from 'fs'
import * as path from 'path'
import { transformGltf } from '../file-formats/gltf'
import { MtlObject, getMaterialTextures, loadMtlFile } from '../file-formats/mtl'
import { cgfConverter } from '../tools/cgf-converter'
import { colladaToGltf } from '../tools/collada-to-gltf'
import type { ModelAsset, ModelMeshAsset, TransformContext } from '../types'
import { appendToFilename, copyFile, logger, mkdir, replaceExtname, transformTextFile, wrapError } from '../utils'

export async function copyMaterial({
  material,
  sourceRoot,
  targetRoot,
}: Pick<ModelMeshAsset & TransformContext, 'material' | 'sourceRoot' | 'targetRoot'>) {
  if (!material) {
    return
  }
  const input = path.join(sourceRoot, material)
  const output = path.join(targetRoot, material)

  await copyFile(input, output, {
    createDir: true,
  }).catch(wrapError(`copy material failed ${input}`))
}

function transitFileNames({
  rootDir,
  material,
  model,
  hash,
}: {
  rootDir: string
  material: string
  model: string
  hash: string
}) {
  model = path.join(rootDir, appendToFilename(model, hash ? `_${hash}` : '')).replace(/\s+/gi, '_')
  material = material ? path.join(rootDir, material) : null
  return {
    rootDir,
    material: material,
    model: model,
    dae: replaceExtname(model, '.dae'),
    gltf: replaceExtname(model, '.gltf'),
  }
}

export async function preprocessModel({
  model,
  material,
  hash,
  sourceRoot,
  targetRoot,
  update,
}: Pick<ModelMeshAsset & TransformContext, 'model' | 'material' | 'hash' | 'sourceRoot' | 'targetRoot' | 'update'>) {
  if (!model) {
    return
  }

  const modelSrc = path.join(sourceRoot, model)
  const files = transitFileNames({ rootDir: targetRoot, material, model, hash })

  for (const file of [files.model, files.dae, files.gltf]) {
    if (update && file && fs.existsSync(file)) {
      fs.rmSync(file)
    }
  }

  await copyFile(modelSrc, files.model, {
    createDir: true,
  }).catch(wrapError(`copy model failed\n\t${modelSrc}`))

  if (fs.existsSync(files.gltf) && !update) {
    logger.info(`skipped`)
    return
  }

  if (!fs.existsSync(files.dae) || update) {
    await cgfConverter({
      input: files.model,
      material: files.material,
      dataDir: targetRoot, // speeds up texture lookup, but writes wrong relative path names for textures
      outDir: path.dirname(files.dae),
      logLevel: 0,
      png: true,
    })
      .then(() => {
        if (!fs.existsSync(files.dae)) {
          throw new Error(`no dae file generated`)
        }
      })
      .catch(wrapError(`cgf-converter failed\n\t${files.model}`))

    await transformTextFile(files.dae, async (text) => {
      // TODO: review paths. fix and remove this workaround
      text = text.replace(/<init_from>([^<]*\.(png|dds))<\/init_from>/gm, (match, texturePath) => {
        texturePath = texturePath.replace(/(..[/\\])+/, '')
        texturePath = path.join(targetRoot, texturePath)
        texturePath = path.relative(path.dirname(files.dae), replaceExtname(texturePath, '.png'))
        return `<init_from>${texturePath}<\/init_from>`
      })
      // colladaToGltf fails, when materials contain extra tags
      // remove them
      text = text
        .split('<extra>')
        .map((it) => {
          const index = it.indexOf('</extra>')
          if (index > 0) {
            it = it.substr(index + 8)
          }
          return it
        })
        .join('')
      return text
    }).catch(wrapError(`transform dae model failed`))
  } else {
    logger.info(`skipped ${files.dae}`)
  }

  if (!fs.existsSync(files.gltf)) {
    await new Promise((resolve) => process.nextTick(resolve))
    await colladaToGltf({
      input: files.dae,
      output: files.gltf,
    })
      .then(() => {
        if (!fs.existsSync(files.dae)) {
          throw new Error(`no gltf file generated`)
        }
      })
      .catch(wrapError(`collada2gltf failed\n\t${files.dae}`))
  } else {
    logger.info(`skipped ${files.gltf}`)
  }
}

export async function processModel({
  meshes,
  appearance,
  transitRoot,
  targetRoot,
  update,
  outDir,
  outFile,
  draco,
  webp,
  ktx,
}: ModelAsset & TransformContext & { webp?: boolean; draco?: boolean; ktx?: boolean }) {
  if (!meshes?.length) {
    return
  }

  const finalFile = path.join(targetRoot, outDir, outFile).toLowerCase()
  if (fs.existsSync(finalFile) && update) {
    fs.rmSync(finalFile)
  }

  if (fs.existsSync(finalFile) && !update) {
    logger.info(`skipped`)
    return
  }

  await mkdir(path.dirname(finalFile), {
    recursive: true,
  })

  await Promise.all(
    meshes.map(async ({ model, material, hash, transform }) => {
      const files = transitFileNames({ rootDir: transitRoot, material, model, hash })
      return {
        model: files.gltf,
        material: await getMaterial(files.rootDir, files.material),
        transform,
      }
    }),
  )
    .then((meshes) => {
      return transformGltf({
        meshes: meshes,
        output: finalFile,
        appearance: appearance,
        withDraco: draco,
        withWebp: webp,
        withKtx: ktx,
      })
    })
    .catch(wrapError(`transformGltf failed\n\t${finalFile}`))
}

// loads the material file and transforms the texture paths
// - textures are already in the targetRoot
// - textures are already in .png format
async function getMaterial(targetRoot: string, filePath: string): Promise<MtlObject[]> {
  if (!filePath) {
    return null
  }
  const result = await loadMtlFile(filePath)
  return result.map((mtl) => {
    mtl.Textures
    return {
      ...mtl,
      Textures: {
        Texture: getMaterialTextures(mtl).map((tex) => {
          return {
            ...tex,
            File: path.join(targetRoot, replaceExtname(tex.File, '.png')),
          }
        }),
      },
    }
  })
}
