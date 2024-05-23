export type CharacterDefinitionDocument = {
  CharacterDefinition: CharacterDefinition
}
export type CharacterDefinition = {
  Model: {
    File: string
  }
  AttachmentList: AttachmentList
}
export interface AttachmentList {
  Attachment: Attachment[]
}
export interface Attachment {
  Type: string
  AName: string
  SerialNumber: string
}

export interface SkinAttachment extends Attachment {
  Type: 'CA_SKIN'
  Binding: string
  Material: string
  Flags: number
}
export interface ClothAttachment extends Attachment {
  Type: 'CA_CLOTH'
  Binding: string
  Material: string
  Flags: number
}
