import { create } from 'zustand'

import { loadPersistedState, savePersistedState } from '@/lib/persistence'
import type { EditorDocument, PersistedState } from '@/types/document'

const UNTITLED_NAME = '無題.md'
const PERSIST_DEBOUNCE_MS = 400

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEmptyDocument(name = UNTITLED_NAME, content = ''): EditorDocument {
  return {
    id: generateId(),
    name,
    content,
    savedContent: content,
    sourceKind: 'plain',
    createdAt: Date.now(),
  }
}

interface OpenedFileInput {
  name: string
  content: string
  handle: FileSystemFileHandle | null
}

interface DocumentsState {
  documents: EditorDocument[]
  activeId: string | null
  handles: Map<string, FileSystemFileHandle>

  createDocument: () => string
  openDocuments: (files: OpenedFileInput[]) => string | null
  closeDocument: (id: string) => void
  setActiveId: (id: string) => void
  updateContent: (id: string, content: string) => void
  markSaved: (
    id: string,
    content: string,
    handle?: FileSystemFileHandle | null,
    name?: string,
  ) => void
  renameDocument: (id: string, name: string) => void
  getHandle: (id: string) => FileSystemFileHandle | null
}

function withNextActive(documents: EditorDocument[], removedId: string, prevActive: string | null) {
  if (prevActive !== removedId) return prevActive
  const remainingIds = documents.filter((doc) => doc.id !== removedId).map((doc) => doc.id)
  return remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null
}

export const useDocumentsStore = create<DocumentsState>()((set, get) => ({
  documents: [],
  activeId: null,
  handles: new Map(),

  createDocument: () => {
    const doc = createEmptyDocument()
    set((state) => ({ documents: [...state.documents, doc], activeId: doc.id }))
    return doc.id
  },

  openDocuments: (files) => {
    if (files.length === 0) return null
    let firstId: string | null = null
    set((state) => {
      const nextHandles = new Map(state.handles)
      const newDocs = files.map(({ name, content, handle }) => {
        const doc = createEmptyDocument(name, content)
        doc.sourceKind = handle ? 'handle' : 'plain'
        if (handle) nextHandles.set(doc.id, handle)
        return doc
      })
      firstId = newDocs[0]?.id ?? null
      return {
        documents: [...state.documents, ...newDocs],
        activeId: firstId ?? state.activeId,
        handles: nextHandles,
      }
    })
    return firstId
  },

  closeDocument: (id) => {
    set((state) => {
      const documents = state.documents.filter((doc) => doc.id !== id)
      const nextHandles = new Map(state.handles)
      nextHandles.delete(id)
      return {
        documents,
        activeId: withNextActive(state.documents, id, state.activeId),
        handles: nextHandles,
      }
    })
  },

  setActiveId: (id) => set({ activeId: id }),

  updateContent: (id, content) => {
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? { ...doc, content } : doc)),
    }))
  },

  markSaved: (id, content, handle, name) => {
    set((state) => {
      const nextHandles = new Map(state.handles)
      if (handle) nextHandles.set(id, handle)
      return {
        documents: state.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                content,
                savedContent: content,
                name: name ?? doc.name,
                sourceKind: nextHandles.has(id) ? 'handle' : doc.sourceKind,
              }
            : doc,
        ),
        handles: nextHandles,
      }
    })
  },

  renameDocument: (id, name) => {
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? { ...doc, name } : doc)),
    }))
  },

  getHandle: (id) => get().handles.get(id) ?? null,
}))

/** 起動時に localStorage から復元する。File System のハンドルは復元できないため plain 扱いにする。 */
function hydrateDocumentsStore(): void {
  const persisted = loadPersistedState()
  if (persisted && persisted.documents.length > 0) {
    const documents: EditorDocument[] = persisted.documents.map((doc) => ({
      ...doc,
      sourceKind: 'plain',
    }))
    const activeId =
      persisted.activeId && documents.some((doc) => doc.id === persisted.activeId)
        ? persisted.activeId
        : documents[0].id
    useDocumentsStore.setState({ documents, activeId, handles: new Map() })
    return
  }
  const doc = createEmptyDocument()
  useDocumentsStore.setState({ documents: [doc], activeId: doc.id, handles: new Map() })
}

// モジュール読み込み時（アプリ起動時）に一度だけ復元する。ES モジュールはシングルトンとして
// 評価されるため、StrictMode の effect 二重実行の影響を受けない。
hydrateDocumentsStore()

let persistTimer: number | undefined
useDocumentsStore.subscribe((state) => {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    const persisted: PersistedState = {
      version: 1,
      activeId: state.activeId,
      documents: state.documents.map(
        ({ id, name, content, savedContent, sourceKind, createdAt }) => ({
          id,
          name,
          content,
          savedContent,
          sourceKind,
          createdAt,
        }),
      ),
    }
    savePersistedState(persisted)
  }, PERSIST_DEBOUNCE_MS)
})
