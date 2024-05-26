import path from 'node:path'

export function resolveTool(toolName: string): string {
  // TODO: resolve tool from PATH
  return path.join(__dirname, '../../../tools', toolName)
}
