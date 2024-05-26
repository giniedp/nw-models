import fs from 'node:fs'

export function readClothGeometryReferences(file: string): string {
  if (!fs.existsSync(file)) {
    return null
  }
  const data = fs.readFileSync(file, 'utf-8')
  const match = data.match(/objects[\/\\].*\.(skin|cgf)/gi)
  if (match) {
    return match[0]
  }
  return null
}
