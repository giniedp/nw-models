import { mat4 } from "@gltf-transform/core"

export function cryToGltfVec3([x, y, z]: [number, number, number]) {
  return [-x, z, y]
}

export function cryToGltfQuat([x, y, z, w]: [number, number, number, number]) {
  return [-x, z, y, w]
}

export function cryToGltfVec3Array(list: Array<[number, number, number]>) {
  return list.map(cryToGltfVec3)
}

export function cryToGltfVec3TypedArray(list: Float32Array): void {
  for (let i = 0; i < list.length; i += 3) {
    const x = list[i]
    const y = list[i + 1]
    const z = list[i + 2]
    list[i] = -x
    list[i + 1] = z
    list[i + 2] = y
  }
}

export function cryToGltfAuatArray(list: Array<[number, number, number, number]>) {
  return list.map(cryToGltfQuat)
}

export function cryToGltfQuatTypedArray(list: Float32Array): void {
  for (let i = 0; i < list.length; i += 4) {
    const x = list[i]
    const y = list[i + 1]
    const z = list[i + 2]
    const w = list[i + 3]
    list[i] = -x
    list[i + 1] = z
    list[i + 2] = y
    list[i + 3] = w
  }
}
export function normalizeQuatTypedArray(list: Float32Array): void {
  for (let i = 0; i < list.length; i += 4) {
    const x = list[i]
    const y = list[i + 1]
    const z = list[i + 2]
    const w = list[i + 3]
    const d = 1 / Math.sqrt(x * x + y * y + z * z + w * w)
    list[i] = x * d
    list[i + 1] = y * d
    list[i + 2] = z * d
    list[i + 3] = w * d
  }
}

export function mat4IsIdentity(m: mat4, precision = 0.00001) {
  for (let i = 0; i < 16; i++) {
    if (i % 5 === 0) {
      if (Math.abs(m[i] - 1) > precision) {
        return false
      }
    } else {
      if (Math.abs(m[i]) > precision) {
        return false
      }
    }
  }
  return true
}

// M':   swapped matrix
// T:    swap matrix = new Matrix4x4(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1)
// T^-1: inverse of swap matrix (= T, for this specific configuration)
// M' = T @ M @ T^-1 = <what's below>
export function cryToGltfMat4(mat: mat4): mat4 {
  // prettier-ignore
  return [
    mat[0],  -mat[2],  -mat[1], -mat[3],
    -mat[8],  mat[10], mat[9],  mat[11],
    -mat[4],  mat[6],  mat[5],  mat[7],
    -mat[12], mat[14], mat[13], mat[15]
  ]
}

export function mat4Transpose(m: mat4): mat4 {
  return [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]]
}

export function mat4Identity(): mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

export function mat4Concat(a: mat4, b: mat4, out?: mat4) {
  return mat4Multiply(b, a, out)
}
export function mat4Multiply(a: mat4, b: mat4, out?: mat4) {
  const c = out || ([] as any as mat4)

  const a00 = a[0]
  const a01 = a[1]
  const a02 = a[2]
  const a03 = a[3]
  const a10 = a[4]
  const a11 = a[5]
  const a12 = a[6]
  const a13 = a[7]
  const a20 = a[8]
  const a21 = a[9]
  const a22 = a[10]
  const a23 = a[11]
  const a30 = a[12]
  const a31 = a[13]
  const a32 = a[14]
  const a33 = a[15]

  const b00 = b[0]
  const b01 = b[1]
  const b02 = b[2]
  const b03 = b[3]
  const b10 = b[4]
  const b11 = b[5]
  const b12 = b[6]
  const b13 = b[7]
  const b20 = b[8]
  const b21 = b[9]
  const b22 = b[10]
  const b23 = b[11]
  const b30 = b[12]
  const b31 = b[13]
  const b32 = b[14]
  const b33 = b[15]

  c[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30
  c[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31
  c[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32
  c[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33
  c[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30
  c[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31
  c[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32
  c[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33
  c[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30
  c[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31
  c[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32
  c[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33
  c[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30
  c[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31
  c[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32
  c[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
  return c
}

export function mat4FromQuaternion({ x, y, z, w }: { x: number; y: number; z: number; w: number }) {
  const xx = x * x
  const xy = x * y
  const xz = x * z
  const xw = x * w

  const yy = y * y
  const yz = y * z
  const yw = y * w

  const zz = z * z
  const zw = z * w

  const m: mat4 = [] as any
  m[0] = 1 - 2 * (yy + zz)
  m[1] = 2 * (xy + zw)
  m[2] = 2 * (xz - yw)
  m[3] = 0

  m[4] = 2 * (xy - zw)
  m[5] = 1 - 2 * (zz + xx)
  m[6] = 2 * (yz + xw)
  m[7] = 0

  m[8] = 2 * (xz + yw)
  m[9] = 2 * (yz - xw)
  m[10] = 1 - 2 * (yy + xx)
  m[11] = 0

  m[12] = 0
  m[13] = 0
  m[14] = 0
  m[15] = 1
  return m
}
