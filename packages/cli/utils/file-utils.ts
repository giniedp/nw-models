import { createHash } from 'crypto'
import fastGlob from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import { ZodSchema } from 'zod'
import { logger } from './logger'

export async function mkdir(dirPath: string, options?: fs.MakeDirectoryOptions) {
  return fs.promises.mkdir(dirPath, options)
}

export async function copyFile(input: string, output: string, options?: { createDir: boolean }) {
  if (options?.createDir) {
    await mkdir(path.dirname(output), { recursive: true })
  }
  logger.activity('copy', input, '->', output)
  return fs.promises.copyFile(input, output)
}

export async function writeFile(
  input: string,
  data: string,
  options: { createDir?: boolean; encoding: BufferEncoding },
) {
  if (options?.createDir) {
    await mkdir(path.dirname(input), { recursive: true })
  }
  logger.activity('write', input)
  return fs.promises.writeFile(input, data, {
    encoding: options.encoding,
  })
}

export async function writeFileBinary(input: string, data: Uint8Array, options: { createDir?: boolean }) {
  if (options?.createDir) {
    await mkdir(path.dirname(input), { recursive: true })
  }
  logger.activity('write', input)
  return fs.promises.writeFile(input, data)
}

export function replaceExtname(file: string, extname: string) {
  const dir = path.dirname(file)
  const base = path.basename(file, path.extname(file))
  return path.join(dir, base) + extname
}

export function appendToFilename(file: string, toAppend: string) {
  const extname = path.extname(file)
  const dir = path.dirname(file)
  const base = path.basename(file, extname)
  return path.join(dir, base) + toAppend + extname
}

export function glob(pattern: string | string[], options?: fastGlob.Options): Promise<string[]> {
  options = options || {}
  options.caseSensitiveMatch = options.caseSensitiveMatch ?? false
  pattern = (Array.isArray(pattern) ? pattern : [pattern]).map((it) => it.replace(/\\/gi, '/'))
  return fastGlob(pattern, options)
}

export async function readJSONFile<T = any>(input: string, schema?: ZodSchema<T>) {
  const data = await fs.promises.readFile(input, { encoding: 'utf-8' })
  const json = JSON.parse(data)
  if (schema) {
    return schema.parse(json)
  }
  return json as T
}

export function md5FromFile(filePath: string) {
  return new Promise<string>((res, rej) => {
    const hash = createHash('md5')

    const rStream = fs.createReadStream(filePath)
    rStream.on('data', (data) => {
      hash.update(data)
    })
    rStream.on('end', () => {
      res(hash.digest('hex'))
    })
  })
}
