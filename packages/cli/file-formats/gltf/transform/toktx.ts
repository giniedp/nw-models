
// import fs from 'fs'
// import path from 'path'
// import semver from 'semver'
// import tmp from 'tmp'

// import {
//   Document,
//   FileUtils,
//   ILogger,
//   ImageUtils,
//   Texture,
//   TextureChannel,
//   Transform,
//   uuid,
//   vec2,
// } from '@gltf-transform/core';
// import { KHRTextureBasisu } from '@gltf-transform/extensions';
// import {
//   createTransform,
//   getTextureChannelMask,
//   getTextureColorSpace,
//   listTextureSlots,
// } from '@gltf-transform/functions';
// import { ChildProcess, spawn } from 'child_process';
// import { KtxCreateOptions, KtxEncodeBasisOptions, KtxEncodeOptions, KtxEncodeUastcOptions } from '../../../tools/ktx-create';

// tmp.setGracefulCleanup();

// const KTX_SOFTWARE_VERSION_MIN = '4.0.0-rc1';
// const KTX_SOFTWARE_VERSION_ACTIVE = '4.1.0-rc1';

// const { R, G } = TextureChannel;

// // export const Mode = {
// //   ETC1S: 'etc1s',
// //   UASTC: 'uastc',
// // };

// // export const Filter = {
// //   BOX: 'box',
// //   TENT: 'tent',
// //   BELL: 'bell',
// //   BSPLINE: 'b-spline',
// //   MITCHELL: 'mitchell',
// //   LANCZOS3: 'lanczos3',
// //   LANCZOS4: 'lanczos4',
// //   LANCZOS6: 'lanczos6',
// //   LANCZOS12: 'lanczos12',
// //   BLACKMAN: 'blackman',
// //   KAISER: 'kaiser',
// //   GAUSSIAN: 'gaussian',
// //   CATMULLROM: 'catmullrom',
// //   QUADRATIC_INTERP: 'quadratic_interp',
// //   QUADRATIC_APPROX: 'quadratic_approx',
// //   QUADRATIC_MIX: 'quadratic_mix',
// // };

// // interface GlobalOptions {
// //   mode: string;
// //   /** Pattern identifying textures to compress, matched to name or URI. */
// //   pattern?: RegExp | null;
// //   /**
// //    * Pattern matching the material texture slot(s) to be compressed or converted.
// //    */
// //   slots?: RegExp | null;
// //   filter?: string;
// //   filterScale?: number;
// //   resize?: vec2;
// //   powerOfTwo?: boolean;
// //   jobs?: number;
// // }

// // export interface ETC1SOptions extends GlobalOptions {
// //   quality?: number;
// //   compression?: number;
// //   maxEndpoints?: number;
// //   maxSelectors?: number;
// //   rdoOff?: boolean;
// //   rdoThreshold?: number;
// // }

// // export interface UASTCOptions extends GlobalOptions {
// //   level?: number;
// //   rdo?: number;
// //   rdoDictionarySize?: number;
// //   rdoBlockScale?: number;
// //   rdoStdDev?: number;
// //   rdoMultithreading?: boolean;
// //   zstd?: number;
// // }

// // const GLOBAL_DEFAULTS: Omit<GlobalOptions, 'mode'> = {
// //   filter: Filter.LANCZOS4,
// //   filterScale: 1,
// //   powerOfTwo: false,
// //   pattern: null,
// //   slots: null,
// //   // See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
// //   jobs: 2 * NUM_CPUS,
// // };

// // export const ETC1S_DEFAULTS: Omit<ETC1SOptions, 'mode'> = {
// //   quality: 128,
// //   compression: 1,
// //   ...GLOBAL_DEFAULTS,
// // };

// // export const UASTC_DEFAULTS: Omit<UASTCOptions, 'mode'> = {
// //   level: 2,
// //   rdo: 0,
// //   rdoDictionarySize: 32768,
// //   rdoBlockScale: 10.0,
// //   rdoStdDev: 18.0,
// //   rdoMultithreading: true,
// //   zstd: 18,
// //   ...GLOBAL_DEFAULTS,
// // };

// /**********************************************************************************************
//  * Implementation.
//  */

// export interface ToKtxOptions {
//   tmpDir?: string
//   textures: Array<{
//     match: RegExp | ((texture: Texture, doc: Document) => boolean),
//     options: Omit<KtxCreateOptions, 'input' | 'output'>
//   }>
// }
// export const toktx = function (options: ToKtxOptions): Transform {
  
//   // options = {
//   //   ...(options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS),
//   //   ...options,
//   // };

//   return createTransform('toktx', async (doc: Document): Promise<void> => {
//     const logger = doc.getLogger()
//     const version = await checkKTXSoftware(logger)
//     const batchPrefix = uuid()
//     const batchDir = path.join(options.tmpDir || tmp.tmpdir, 'toktx')

//     if (!fs.existsSync(batchDir)) {
//       fs.mkdirSync(batchDir)
//     }

//     const basisuExtension = doc.createExtension(KHRTextureBasisu).setRequired(true);

//     let numCompressed = 0;

//     const textures = doc.getRoot().listTextures();
//     const numTextures = textures.length;
//     for (const texture of textures) {
//       const textureIndex = textures.indexOf(texture);
//       const textureLabel =
//         texture.getURI() ||
//         texture.getName() ||
//         `${textureIndex + 1}/${textures.length}`;
//       if (texture.getMimeType() === 'image/ktx2') {
//         logger.debug(`${textureLabel}: Skipping, already KTX.`);
//         continue
//       }
//       if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
//         logger.warn(`${textureLabel}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
//         continue
//       }
//       const textureOptions = options.textures.find((it) => {
//         if (it.match instanceof RegExp) {
//           return it.match.test(textureLabel)
//         }
//         return it.match(texture, doc)
//       })?.options
//       if (textureOptions) {
//         logger.debug(`${textureLabel}: Skipping, excluded by matcher.`);
//         continue
//       }
//       await processTexture({
//         doc, texture
//       })
//     }


//     if (numCompressed === 0) {
//       logger.warn('toktx: No textures were found, or none were selected for compression.');
//     }

//     const usesKTX2 = doc
//       .getRoot()
//       .listTextures()
//       .some((t) => t.getMimeType() === 'image/ktx2');

//     if (!usesKTX2) {
//       basisuExtension.dispose();
//     }
//   });
// };

// async function processTexture({ doc, texture, textureLabel }: {
//   doc: Document,
//   texture: Texture,
//   textureLabel: string,
// }) {
//   const logger = doc.getLogger();
//   const textures = doc.getRoot().listTextures();
//   const textureIndex = textures.indexOf(texture);
//   const slots = listTextureSlots(texture);
//   const channels = getTextureChannelMask(texture);
//   const prefix = `toktx:texture(${textureLabel})`;
//   logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`);


//   const image = texture.getImage();
  
//   // PREPARE: Create temporary in/out paths for the 'toktx' CLI tool, and determine
//   // necessary command-line flags.

//   const extension = texture.getURI()
//     ? FileUtils.extension(texture.getURI())
//     : ImageUtils.mimeTypeToExtension(texture.getMimeType());

//   const inPath = path.join(batchDir, `${batchPrefix}_${textureIndex}.${extension}`);
//   const outPath = path.join(batchDir, `${batchPrefix}_${textureIndex}.ktx2`);

//   const inBytes = image.byteLength;
//   await fs.promises.writeFile(inPath, Buffer.from(image));

//   const params = [
//     ...createParams(texture, slots, channels, size, logger, numTextures, options, version),
//     outPath,
//     inPath,
//   ];
//   logger.debug(`${prefix}: Spawning → toktx ${params.join(' ')}`);

//   // COMPRESS: Run `toktx` CLI tool.
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const [status, stdout, stderr] = await waitExit(spawn('toktx', params as string[]));

//   if (status !== 0) {
//     logger.error(`${prefix}: Failed → \n\n${stderr.toString()}`);
//   } else {
//     // PACK: Replace image data in the glTF asset.

//     texture.setImage(await fs.readFile(outPath)).setMimeType('image/ktx2');

//     if (texture.getURI()) {
//       texture.setURI(FileUtils.basename(texture.getURI()) + '.ktx2');
//     }

//     numCompressed++;
//   }

//   const outBytes = texture.getImage()!.byteLength;
//   logger.debug(`${prefix}: ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes`);
// }

// /**********************************************************************************************
//  * Utilities.
//  */

// /** Create CLI parameters from the given options. Attempts to write only non-default options. */
// function createParams(
//   texture: Texture,
//   slots: string[],
//   channels: number,
//   size: vec2,
//   logger: ILogger,
//   numTextures: number,
//   options: ETC1SOptions | UASTCOptions,
//   version: string
// ): (string | number)[] {
//   const params: (string | number)[] = [];
//   params.push('--genmipmap');
//   if (options.filter !== GLOBAL_DEFAULTS.filter) params.push('--filter', options.filter!);
//   if (options.filterScale !== GLOBAL_DEFAULTS.filterScale) {
//     params.push('--fscale', options.filterScale!);
//   }

//   if (options.mode === Mode.UASTC) {
//     const _options = options as UASTCOptions;
//     params.push('--uastc', _options.level!);
//     if (_options.rdo !== UASTC_DEFAULTS.rdo) {
//       params.push('--uastc_rdo_l', _options.rdo!);
//     }
//     if (_options.rdoDictionarySize !== UASTC_DEFAULTS.rdoDictionarySize) {
//       params.push('--uastc_rdo_d', _options.rdoDictionarySize!);
//     }
//     if (_options.rdoBlockScale !== UASTC_DEFAULTS.rdoBlockScale) {
//       params.push('--uastc_rdo_b', _options.rdoBlockScale!);
//     }
//     if (_options.rdoStdDev !== UASTC_DEFAULTS.rdoStdDev) {
//       params.push('--uastc_rdo_s', _options.rdoStdDev!);
//     }
//     if (!_options.rdoMultithreading) {
//       params.push('--uastc_rdo_m');
//     }
//     if (_options.zstd && _options.zstd > 0) params.push('--zcmp', _options.zstd);
//   } else {
//     const _options = options as ETC1SOptions;
//     params.push('--bcmp');
//     if (_options.quality !== ETC1S_DEFAULTS.quality) {
//       params.push('--qlevel', _options.quality!);
//     }
//     if (_options.compression !== ETC1S_DEFAULTS.compression) {
//       params.push('--clevel', _options.compression!);
//     }
//     if (_options.maxEndpoints) params.push('--max_endpoints', _options.maxEndpoints);
//     if (_options.maxSelectors) params.push('--max_selectors', _options.maxSelectors);

//     if (_options.rdoOff) {
//       params.push('--no_endpoint_rdo', '--no_selector_rdo');
//     } else if (_options.rdoThreshold) {
//       params.push('--endpoint_rdo_threshold', _options.rdoThreshold);
//       params.push('--selector_rdo_threshold', _options.rdoThreshold);
//     }
//   }

//   if (slots.find((slot) => /normal/.test(slot))) {
//     // See: https://github.com/KhronosGroup/KTX-Software/issues/600
//     if (semver.gte(version, KTX_SOFTWARE_VERSION_ACTIVE)) {
//       params.push('--normal_mode', '--input_swizzle', 'rgb1');
//     } else if (options.mode === Mode.ETC1S) {
//       params.push('--normal_map');
//     }
//   }

//   if (slots.length && getTextureColorSpace(texture) !== 'srgb') {
//     // See: https://github.com/donmccurdy/glTF-Transform/issues/215
//     params.push('--assign_oetf', 'linear', '--assign_primaries', 'none');
//   }

//   if (channels === R) {
//     params.push('--target_type', 'R');
//   } else if (channels === G || channels === (R | G)) {
//     params.push('--target_type', 'RG');
//   }

//   // Minimum size on any dimension is 4px.
//   // See: https://github.com/donmccurdy/glTF-Transform/issues/502

//   let width: number;
//   let height: number;
//   if (options.powerOfTwo) {
//     width = preferredPowerOfTwo(size[0]);
//     height = preferredPowerOfTwo(size[1]);
//   } else {
//     if (!isPowerOfTwo(size[0]) || !isPowerOfTwo(size[1])) {
//       logger.warn(
//         `toktx: Texture dimensions ${size[0]}x${size[1]} are NPOT, and may` +
//         ' fail in older APIs (including WebGL 1.0) on certain devices.'
//       );
//     }
//     width = isMultipleOfFour(size[0]) ? size[0] : ceilMultipleOfFour(size[0]);
//     height = isMultipleOfFour(size[1]) ? size[1] : ceilMultipleOfFour(size[1]);
//   }

//   if (width !== size[0] || height !== size[1] || options.resize) {
//     if (width > 4096 || height > 4096) {
//       logger.warn(
//         `toktx: Resizing to nearest power of two, ${width}x${height}px. Texture dimensions` +
//         ' greater than 4096px may not render on some mobile devices.' +
//         ' Resize to a lower resolution before compressing, if needed.'
//       );
//     }
//     params.push('--resize', `${width}x${height}`);
//   }

//   if (options.jobs && options.jobs > 1 && numTextures > 1) {
//     // See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
//     const threads = Math.max(2, Math.min(NUM_CPUS, (3 * NUM_CPUS) / numTextures));
//     params.push('--threads', threads);
//   }

//   return params;
// }

// async function checkKTXSoftware(logger: ILogger): Promise<string> {

//   const [status, stdout, stderr] = await waitExit(spawn('toktx', ['--version']));

//   const version = ((stdout || stderr) as string)
//     .replace(/toktx\s+/, '')
//     .replace(/~\d+/, '')
//     .trim();

//   if (status !== 0 || !semver.valid(semver.clean(version))) {
//     throw new Error('Unable to find "toktx" version. Confirm KTX-Software is installed.');
//   } else if (semver.lt(semver.clean(version)!, KTX_SOFTWARE_VERSION_MIN)) {
//     logger.warn(`toktx: Expected KTX-Software >= v${KTX_SOFTWARE_VERSION_MIN}, found ${version}.`);
//   } else {
//     logger.debug(`toktx: Found KTX-Software ${version}.`);
//   }

//   return semver.clean(version)!;
// }

// function isPowerOfTwo(value: number): boolean {
//   if (value <= 2) return true;
//   return (value & (value - 1)) === 0 && value !== 0;
// }

// function preferredPowerOfTwo(value: number): number {
//   if (value <= 4) return 4;

//   const lo = floorPowerOfTwo(value);
//   const hi = ceilPowerOfTwo(value);

//   if (hi - value > value - lo) return lo;
//   return hi;
// }

// function floorPowerOfTwo(value: number): number {
//   return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
// }

// function ceilPowerOfTwo(value: number): number {
//   return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
// }

// function isMultipleOfFour(value: number): boolean {
//   return value % 4 === 0;
// }

// function ceilMultipleOfFour(value: number): number {
//   if (value <= 4) return 4;
//   return value % 4 ? value + 4 - (value % 4) : value;
// }

// export async function waitExit(process: ChildProcess): Promise<[unknown, string, string]> {
//   let stdout = '';
//   if (process.stdout) {
//     for await (const chunk of process.stdout) {
//       stdout += chunk;
//     }
//   }
//   let stderr = '';
//   if (process.stderr) {
//     for await (const chunk of process.stderr) {
//       stderr += chunk;
//     }
//   }
//   const status = await new Promise((resolve, _) => {
//     process.on('close', resolve);
//   });
//   return [status, stdout, stderr];
// }

// function formatBytes(bytes: number, decimals = 2): string {
//   if (bytes === 0) return '0 Bytes';

//   const k = 1000;
//   const dm = decimals < 0 ? 0 : decimals;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

//   const i = Math.floor(Math.log(bytes) / Math.log(k));

//   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
// }
