export type DocumentSourceKind = 'handle' | 'plain'

export interface EditorDocument {
  id: string
  name: string
  content: string
  savedContent: string
  sourceKind: DocumentSourceKind
  createdAt: number
}

export interface PersistedDocument {
  id: string
  name: string
  content: string
  savedContent: string
  sourceKind: DocumentSourceKind
  createdAt: number
}

export interface PersistedState {
  version: 1
  activeId: string | null
  documents: PersistedDocument[]
}

export function isDocumentDirty(doc: EditorDocument): boolean {
  return doc.content !== doc.savedContent
}
