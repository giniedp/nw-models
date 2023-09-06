import cp from 'child_process'
import { logger, spawn } from '../utils'
import fs from 'fs'
import { Readable } from 'stream'

export interface KtxEncodeOptions {
  codec: string
  /**
   * Only valid for linear textures with two or more components. If the input texture has three or four linear components
   * it is assumed to be a three component linear normal map storing unit length normals as (R=X, G=Y, B=Z).
   * A fourth component will be ignored. The map will be converted to a two component X+Y normal map stored as (RGB=X, A=Y) prior to encoding.
   * If unsure that your normals are unit length, use --normalize. If the input has 2 linear components it is assumed to be an X+Y map of unit normals.
   *
   * The Z component can be recovered programmatically in shader code by using the equations:
   *
   * ```
   * nml.xy = texture(...).ga;              // Load in [0,1]
   * nml.xy = nml.xy * 2.0 - 1.0;           // Unpack to [-1,1]
   * nml.z = sqrt(1 - dot(nml.xy, nml.xy)); // Compute Z
   * ```
   *
   * For ETC1S / BasisLZ encoding, '--encode basis-lz', RDO is disabled (no selector RDO, no endpoint RDO) to provide better quality.
   */
  normalMode?: boolean
  /**
   * Explicitly set the number of threads to use during compression.
   * By default, ETC1S / BasisLZ will use the number of threads reported by thread::hardware_concurrency or 1 if value returned is 0.
   */
  threads?: number
  /**
   * Forbid use of the SSE instruction set. Ignored if CPU does not support SSE. SSE can only be disabled on the basis-lz and uastc compressors.
   */
  noSse?: boolean
}

export interface KtxEncodeBasisOptions extends KtxEncodeOptions {
  /**
   * Supercompress the image data with ETC1S / BasisLZ.
   * - RED images will become RGB with RED in each component (RRR).
   * - RG images will have R in the RGB part and G in the alpha part of the compressed texture (RRRG).
   *
   * When set, the following BasisLZ-related options become valid, otherwise they are ignored.
   */
  codec: 'basis-lz'
  /**
   * ETC1S / BasisLZ compression level, an encoding speed vs. quality tradeoff. Range is [0,5], default is 1. Higher values are slower but give higher quality.
   */
  clevel?: number
  /**
   * ETC1S / BasisLZ quality level. Range is [1,255]. Lower gives better compression/lower quality/faster.
   * Higher gives less compression/higher quality/slower.
   *
   * --qlevel automatically determines values for
   *  - --max-endpoints,
   *  - --max-selectors,
   *  - --endpoint-rdo-threshold
   *  - --selector-rdo-threshold
   *
   * for the target quality level.
   * Setting these options overrides the values determined by -qlevel which defaults to 128 if neither it nor --max-endpoints and --max-selectors have been set.
   *
   * Note that both of --max-endpoints and --max-selectors must be set for them to have any effect. If all three options are set, a warning will be issued that --qlevel will be ignored.
   *
   * Note also that --qlevel will only determine values for --endpoint-rdo-threshold and --selector-rdo-threshold when its value exceeds 128, otherwise their defaults will be used.
   */
  qlevel?: number
  /**
   * Manually set the maximum number of color endpoint clusters. Range is [1,16128]. Default is 0, unset.
   */
  maxEndpoints?: number
  /**
   * Set endpoint RDO quality threshold.The default is 1.25.Lower is higher quality but less quality per output bit(try [1.0, 3.0]). This will override the value chosen by--qlevel.
   */
  endpointRdoThreshold?: number
  /**
   * Manually set the maximum number of color selector clusters from [1,16128]. Default is 0, unset.
   */
  maxSelectors?: number
  /**
   * Set selector RDO quality threshold. The default is 1.25. Lower is higher quality but less quality per output bit (try [1.0,3.0]). This will override the value chosen by --qlevel.
   */
  selectorRdoThreshold?: number
  /**
   * Disable endpoint rate distortion optimizations. Slightly faster, less noisy output, but lower quality per output bit. Default is to do endpoint RDO.
   */
  noRndpointRdo?: boolean
  /**
   * Disable selector rate distortion optimizations. Slightly faster, less noisy output, but lower quality per output bit. Default is to do selector RDO.
   */
  noSelectorRdo?: boolean
}

export interface KtxEncodeUastcOptions extends KtxEncodeOptions {
  /**
   * Create a texture in high-quality transcodable UASTC format.
   */
  codec: 'uastc'
  /**
   * This optional parameter selects a speed vs quality tradeoff as shown in the following table:
   *
   * ```
   * Level  Speed      Quality
   *   0    Fastest    43.45dB
   *   1    Faster     46.49dB
   *   2    Default    47.47dB
   *   3    Slower     48.01dB
   *   4    Very slow  48.24dB
   * ```
   * You are strongly encouraged to also specify --zcmp to losslessly compress the UASTC data.
   * This and any LZ-style compression can be made more effective by conditioning the UASTC texture data using
   * the Rate Distortion Optimization (RDO) post-process stage.
   * When uastc encoding is set the following options become available for controlling
   */
  quality: 0 | 1 | 2 | 3 | 4
  /**
   * Enable UASTC RDO post - processing.
   */
  rdo?: boolean
  /**
   * Set UASTC RDO quality scalar (lambda) to lambda.
   * Lower values yield higher quality/larger LZ compressed files, higher values yield lower quality/smaller LZ compressed files.
   * A good range to try is [.25,10]. For normal maps a good range is [.25,.75]. The full range is [.001,10.0]. Default is 1.0.
   */
  rdoL?: number
  /**
   * Set UASTC RDO dictionary size in bytes.
   * Default is 4096.
   * Lower values=faster, but give less compression.
   * Range is [64,65536].
   */
  rdoD?: number
  /**
   * Set UASTC RDO max smooth block error scale. Range is [1.0,300.0].
   * Default is 10.0, 1.0 is disabled.
   * Larger values suppress more artifacts (and allocate more bits) on smooth blocks.
   */
  rdoB?: number
  /**
   * Set UASTC RDO max smooth block standard deviation.
   * Range is[.01, 65536.0].
   * Default is 18.0.Larger values expand the range of blocks considered smooth.
   */
  rdoS?: number
  /**
   * Do not favor simpler UASTC modes in RDO mode.
   */
  rdoF?: boolean
  /**
   * Disable RDO multithreading (slightly higher compression, deterministic).
   */
  rdoM?: boolean
}

export interface KtxCreateOptions {
  /**
   * KTX format enum. The enum names are matching the VkFormats without the VK_FORMAT_ prefix.
   * If the format is an ASTC format the ASTC encoder specific options become valid, otherwise they are ignored.
   * Required. The VK_FORMAT_ prefix is ignored if present. Case insensitive.
   */
  format: string
  /**
   * Specify which encoding mode to use. LDR is the default unless the input image is 16-bit in which case the default is HDR.
   */
  astcMode?: 'ldr' | 'hdr'
  /**
   * The quality level configures the quality-performance tradeoff for the compressor;
   * more complete searches of the search space improve image quality at the expense of compression time.
   * Default is 'medium'. The quality level can be set between fastest (0) and exhaustive (100) via the following fixed quality presets:
   *
   * ```
   *   Level      Quality
   *   fastest    (equivalent to quality = 0)
   *   fast       (equivalent to quality = 10)
   *   medium     (equivalent to quality = 60)
   *   thorough   (equivalent to quality = 98)
   *   exhaustive (equivalent to quality = 100)
   * ```
   */
  astcQuality?: 'fastest' | 'fast' | 'medium' | 'thorough' | 'exhaustive' | number
  /**
   * The codec should optimize for perceptual error, instead of direct RMS error.
   * This aims to improve perceived image quality, but typically lowers the measured PSNR score.
   * Perceptual methods are currently only available for normal maps and RGB color data.
   */
  astcPerceptual?: number
  /**
   * Create a 1D texture. If not set the texture will be a 2D or 3D texture.
   */
  is1D?: boolean
  /**
   * Create a cubemap texture. If not set the texture will be a 2D or 3D texture.
   */
  cubeMap?: boolean
  /**
   * Create from raw image data.
   */
  raw?: boolean
  /**
   * Base level width in pixels.
   */
  width?: number
  /**
   * Base level height in pixels.
   */
  height?: number
  /**
   * Base level depth in pixels. If set the texture will be a 3D texture.
   */
  depth?: number
  /**
   * Number of layers. If set the texture will be an array texture.
   */
  layers?: number
  /**
   * Runtime mipmap generation mode. Sets up the texture to request the mipmaps to be generated by the client application at runtime.
   */
  runtimeMipmap?: boolean
  /**
   * Causes mipmaps to be generated during texture creation. If the –levels is not specified the maximum possible mip level will be generated.
   * This option is mutually exclusive with –runtime-mipmap and cannot be used with SINT, UINT or 3D textures.
   */
  generateMipmap?:
    | boolean
    | {
        /**
         * Specifies the filter to use when generating the mipmaps. Case insensitive. Defaults to lanczos4.
         */
        filter?:
          | 'box'
          | 'tent'
          | 'bell'
          | 'b-spline'
          | 'mitchell'
          | 'blackman'
          | 'lanczos3'
          | 'lanczos4'
          | 'lanczos6'
          | 'lanczos12'
          | 'kaiser'
          | 'gaussian'
          | 'catmullrom'
          | 'quadratic_interp'
          | 'quadratic_approx'
          | 'quadratic_mix'
        /**
         * The filter scale to use. Defaults to 1.0.
         */
        filterScale?: number
        /**
         * Specify how to sample pixels near the image boundaries. Case insensitive. Defaults to clamp.
         */
        wrap?: 'wrap' | 'reflect' | 'clamp'
      }
  encode?: KtxEncodeBasisOptions | KtxEncodeUastcOptions
}

export function paramsForKtxCreate({
  format,
  astcMode,
  astcQuality,
  astcPerceptual,
  is1D,
  cubeMap,
  raw,
  width,
  height,
  depth,
  layers,
  runtimeMipmap,
  generateMipmap,
  encode,
}: KtxCreateOptions) {
  const args = []
  if (format) {
    args.push(`--format`, format)
  }
  if (astcMode) {
    args.push(`--astc-mode`, astcMode)
  }
  if (astcQuality) {
    args.push(`--astc-quality`, String(astcQuality))
  }
  if (astcPerceptual) {
    args.push(`--astc-perceptual`, String(astcPerceptual))
  }
  if (is1D) {
    args.push(`--1d`)
  }
  if (cubeMap) {
    args.push(`--cubemap`)
  }
  if (raw) {
    args.push(`--raw`)
  }
  if (width) {
    args.push(`--width`, String(width))
  }
  if (height) {
    args.push(`--height`, String(height))
  }
  if (depth) {
    args.push(`--depth`, String(depth))
  }
  if (layers) {
    args.push(`--layers`, String(layers))
  }
  if (runtimeMipmap) {
    args.push(`--runtime-mipmap`)
  }
  if (!!generateMipmap) {
    args.push(`--generate-mipmap`)
    if (typeof generateMipmap === 'object') {
      if (generateMipmap.filter) {
        args.push(`--mipmap-filter`, generateMipmap.filter)
      }
      if (generateMipmap.filterScale) {
        args.push(`--mipmap-filter-scale`, String(generateMipmap.filterScale))
      }
      if (generateMipmap.wrap) {
        args.push(`--mipmap-wrap`, generateMipmap.wrap)
      }
    }
  }
  if (encode) {
    if (encode.codec === 'basis-lz') {
      const {
        clevel,
        qlevel,
        maxEndpoints,
        endpointRdoThreshold,
        maxSelectors,
        selectorRdoThreshold,
        noRndpointRdo,
        noSelectorRdo,
      } = encode
      if (clevel) {
        args.push(`--clevel`, String(clevel))
      }
      if (qlevel) {
        args.push(`--qlevel`, String(qlevel))
      }
      if (maxEndpoints) {
        args.push(`--max-endpoints`, String(maxEndpoints))
      }
      if (endpointRdoThreshold) {
        args.push(`--endpoint-rdo-threshold`, String(endpointRdoThreshold))
      }
      if (maxSelectors) {
        args.push(`--max-selectors`, String(maxSelectors))
      }
      if (selectorRdoThreshold) {
        args.push(`--selector-rdo-threshold`, String(selectorRdoThreshold))
      }
      if (noRndpointRdo) {
        args.push(`--no-endpoint-rdo`)
      }
      if (noSelectorRdo) {
        args.push(`--no-selector-rdo`)
      }
    }
    if (encode.codec === 'uastc') {
      const { quality, rdo, rdoL, rdoD, rdoB, rdoS, rdoF, rdoM } = encode
      if (quality) {
        args.push(`--uastc-quality`, String(quality))
      }
      if (rdo) {
        args.push(`--uastc-rdo`)
      }
      if (rdoL) {
        args.push(`--uastc-rdo-l`, String(rdoL))
      }
      if (rdoD) {
        args.push(`--uastc-rdo-d`, String(rdoD))
      }
      if (rdoB) {
        args.push(`--uastc-rdo-b`, String(rdoB))
      }
      if (rdoS) {
        args.push(`--uastc-rdo-s`, String(rdoS))
      }
      if (rdoF) {
        args.push(`--uastc-rdo-f`)
      }
      if (rdoM) {
        args.push(`--uastc-rdo-m`)
      }
    }
    if (encode.normalMode) {
      args.push(`--normal-mode`)
    }
    if (encode.threads) {
      args.push(`--threads`, String(encode.threads))
    }
    if (encode.noSse) {
      args.push(`--no-sse`)
    }
  }
  return args
}

export async function ktxCreate(
  options: {
    exe?: string
    input: string // | fs.ReadStream | Buffer
    output: string
  } & KtxCreateOptions,
) {
  // https://github.com/new-world-tools/new-world-tools
  const cmd = options.exe || 'ktx'
  const args = paramsForKtxCreate(options)
  args.unshift('create')
  // const cmd = 'echo'
  // const args = ['hello world']
  const codes: Record<number, string> = {
    0: 'Success',
    1: 'Command line error',
    2: 'IO failure',
    3: 'Invalid input file',
    4: 'Runtime or library error',
    5: 'Not supported state or operation',
    6: 'Requested feature is not yet implemented',
  }
  const input = options.input

  args.push(options.input)
  args.push(options.output)

  return await spawn(cmd, args, {
    shell: true,
    stdio: logger.isVerbose ? 'inherit' : null,
  }).catch((code: number) => {
    throw codes[code] || code
  })

  // args.push('-') // input from stdin
  // args.push('-') // output to stdout
  // return await new Promise<Buffer>((resolve, reject) => {
  //   logger.activity('spawn', cmd, ...args)

  //   const p = cp.spawn(cmd, args, {
  //     shell: true,
  //     stdio: ['pipe', 'pipe', 'pipe'],
  //   })
  //   const output: Buffer[] = []
  //   const response: Buffer[] = []

  //   p.stdout.on('data', (data) => {
  //     logger.debug('data out')
  //     output.push(data)
  //   })

  //   p.on('data', (data) => {
  //     response.push(data)
  //   })

  //   p.on('error', (data) => {
  //     logger.error(data)
  //   })

  //   p.on('close', (code) => {
  //     if (code) {
  //       reject(codes[code] || code)
  //     } else {
  //       resolve(Buffer.concat(output))
  //     }
  //   })

  //   if (Buffer.isBuffer(input)) {
  //     sendBuffer(p.stdin, input)
  //   } else {
  //     sendStream(p.stdin, input)
  //   }
  // })
}

// function sendBuffer(stdin: cp.ChildProcess['stdin'], binaryData: Buffer) {

//   let offset = 0;

//   function writeChunk() {
//     logger.debug('writeChunk', offset)
//     // Calculate the chunk size based on your needs
//     const chunkSize = 1024; // Adjust this as necessary

//     // Get a slice of the buffer
//     const chunk = binaryData.slice(offset, offset + chunkSize);

//     // Write the chunk to the child process's stdin
//     const canWriteMore = stdin.write(chunk);

//     if (canWriteMore) {
//       // If it's possible to write more data immediately, continue with the next chunk
//       offset += chunk.length;
//       if (offset < binaryData.length) {
//         process.nextTick(writeChunk);
//       }
//     } else {
//       logger.debug('wait')
//       // If the buffer is full, wait for the 'drain' event to resume writing
//       stdin.once('drain', () => {
//         logger.debug('drain')
//         // Continue writing with the next chunk
//         offset += chunk.length;
//         if (offset < binaryData.length) {
//           process.nextTick(writeChunk);
//         }
//       });
//     }
//   }

//   // Start writing the first chunk
//   process.nextTick(writeChunk);
// }

// function sendStream(stdin: cp.ChildProcess['stdin'], stream: fs.ReadStream) {
//   stream.on('data', (chunk) => {
//     logger.debug('write')
//     const canWriteMore = stdin.write(chunk);
//     if (!canWriteMore) {
//       logger.debug('pause')
//       // Pause the file stream to prevent overloading the buffer
//       stream.pause();

//       // Listen for the 'drain' event to resume writing
//       stdin.once('drain', () => {
//         logger.debug('drain')
//         // Resume the file stream
//         process.nextTick(() => stream.resume());
//       });
//     }
//   });
// }
