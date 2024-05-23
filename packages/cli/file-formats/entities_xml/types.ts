export interface ObjectStreamDocument {
  ObjectStream: ObjectStreamNode
}

export interface ObjectStreamNode {
  Class?: ClassNode[]
  version?: number
}
export interface ClassNode {
  Class?: ClassNode[]
  name: string
  field: string
  type: string
  value?: any
  [key: string]: unknown
}
