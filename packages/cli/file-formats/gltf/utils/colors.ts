import { vec3, vec4 } from '@gltf-transform/core'

export function rgbToHex(rgb: vec3 | vec4) {
  if (rgb.length !== 3 && rgb.length !== 4) {
    throw new Error('Invalid rgb color')
  }
  return (
    '#' +
    rgb

      .map((x) => {
        const hex = Math.round(x * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

export function hexToRgb(hex: string, scale = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) * scale,
        g: parseInt(result[2], 16) * scale,
        b: parseInt(result[3], 16) * scale,
      }
    : {
        r: 0,
        g: 0,
        b: 0,
      }
}

export function colorToRgb(color: string) {
  if (color.startsWith('#')) {
    return hexToRgb(color, 1/255)
  }
  if (color.includes(',')) {
    const [r, g, b] = color.split(',').map((x) => parseFloat(x))
    return { r, g, b }
  }
}
