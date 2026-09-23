import { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'

import { AppHeader } from '@/components/layout/AppHeader'
import { SplitPane, type ViewMode } from '@/components/layout/SplitPane'
import { StatusBar } from '@/components/layout/StatusBar'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { HighlightThemeStyle } from '@/components/preview/HighlightThemeStyle'
import { MarkdownPreview } from '@/components/preview/MarkdownPreview'
import { FileTabsBar } from '@/components/tabs/FileTabsBar'
import { TocPanel } from '@/components/toc/TocPanel'
import { EditorToolbar } from '@/components/toolbar/EditorToolbar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useScrollSync } from '@/hooks/useScrollSync'
import { useTheme } from '@/hooks/useTheme'
import { buildStandaloneHtml, downloadHtmlFile } from '@/lib/exportHtml'
import type { TocEntry } from '@/lib/markdown/toc'
import {
  downloadTextFile,
  isFileSystemAccessSupported,
  openFiles,
  readDroppedFiles,
  saveAsWithPicker,
  writeToHandle,
} from '@/lib/fileSystemAccess'
import { useDocumentsStore } from '@/store/documentsStore'
import { isDocumentDirty, type EditorDocument } from '@/types/document'

/** 目次から飛んだ見出しの上に残す余白（見出しが上端に張り付かないように） */
const TOC_SCROLL_MARGIN_PX = 16

function stripExtension(name: string): string {
  return name.replace(/\.mdx?$/i, '')
}

export default function App() {
  const { mode: themeMode, resolvedTheme, setMode: setThemeMode } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const documents = useDocumentsStore((s) => s.documents)
  const activeId = useDocumentsStore((s) => s.activeId)
  const createDocument = useDocumentsStore((s) => s.createDocument)
  const openDocumentsAction = useDocumentsStore((s) => s.openDocuments)
  const closeDocumentAction = useDocumentsStore((s) => s.closeDocument)
  const setActiveId = useDocumentsStore((s) => s.setActiveId)
  const updateContent = useDocumentsStore((s) => s.updateContent)
  const markSaved = useDocumentsStore((s) => s.markSaved)
  const renameDocument = useDocumentsStore((s) => s.renameDocument)
  const getHandle = useDocumentsStore((s) => s.getHandle)

  const activeDoc = useMemo(
    () => documents.find((doc) => doc.id === activeId) ?? null,
    [documents, activeId],
  )

  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [previewViewport, setPreviewViewport] = useState<HTMLDivElement | null>(null)
  const previewSnapshotRef = useRef<HTMLDivElement>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // モバイル幅では分割表示を持たず、常にエディタ/プレビューいずれかのタブ表示にする
  const effectiveViewMode: ViewMode = isMobile && viewMode === 'split' ? 'editor' : viewMode

  // プレビューのみ表示ではエディタは破棄されている。onCreateEditor で受け取った参照は
  // 残ったままなので、表示中のときだけ有効な参照として扱う（破棄済みの view への空振りを防ぐ）
  const liveEditorView = effectiveViewMode === 'preview' ? null : editorView
  const previewVisible = effectiveViewMode !== 'editor'

  useScrollSync({
    editorView: liveEditorView,
    previewViewport,
    enabled: scrollSyncEnabled && effectiveViewMode === 'split',
  })

  const debouncedContent = useDebouncedValue(activeDoc?.content ?? '', 150)

  const handleChange = useCallback(
    (value: string) => {
      if (activeDoc) updateContent(activeDoc.id, value)
    },
    [activeDoc, updateContent],
  )

  const handleNewFile = useCallback(() => {
    createDocument()
    setPendingCloseId(null)
  }, [createDocument])

  const handleOpenFile = useCallback(async () => {
    const files = await openFiles()
    if (files.length > 0) openDocumentsAction(files)
  }, [openDocumentsAction])

  // Ctrl+S / 「保存」: FSA で開いた（=ハンドルを持つ）ファイルのみ上書き保存する。
  // それ以外（新規作成 or 非対応ブラウザで開いたファイル）は常にダウンロードする。
  // ブラウザがFSAに対応していても、ここでネイティブの保存ダイアログは出さない
  // （「名前を付けて保存」で明示的に使う操作と分けるため）。
  const persistSave = useCallback(
    async (doc: EditorDocument) => {
      const handle = getHandle(doc.id)
      if (handle) {
        await writeToHandle(handle, doc.content)
        markSaved(doc.id, doc.content)
        return
      }
      downloadTextFile(doc.name, doc.content)
      markSaved(doc.id, doc.content)
    },
    [getHandle, markSaved],
  )

  const handleSave = useCallback(() => {
    if (activeDoc) void persistSave(activeDoc)
  }, [activeDoc, persistSave])

  const handleSaveAs = useCallback(async () => {
    if (!activeDoc) return
    if (isFileSystemAccessSupported()) {
      const newHandle = await saveAsWithPicker(activeDoc.name, activeDoc.content)
      if (newHandle) markSaved(activeDoc.id, activeDoc.content, newHandle, newHandle.name)
    } else {
      downloadTextFile(activeDoc.name, activeDoc.content)
    }
  }, [activeDoc, markSaved])

  const handleExportHtml = useCallback(async () => {
    if (!activeDoc || !previewSnapshotRef.current) return
    const html = await buildStandaloneHtml({
      previewElement: previewSnapshotRef.current,
      title: stripExtension(activeDoc.name),
      theme: resolvedTheme,
    })
    downloadHtmlFile(`${stripExtension(activeDoc.name) || 'export'}.html`, html)
  }, [activeDoc, resolvedTheme])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (documents.some(isDocumentDirty)) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [documents])

  const requestClose = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id)
      if (doc && isDocumentDirty(doc)) {
        setPendingCloseId(id)
      } else {
        closeDocumentAction(id)
      }
    },
    [documents, closeDocumentAction],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDraggingOver(false)
      if (!event.dataTransfer) return
      void readDroppedFiles(event.dataTransfer).then((files) => {
        if (files.length > 0) openDocumentsAction(files)
      })
    },
    [openDocumentsAction],
  )

  const handleTocNavigate = useCallback(
    (entry: TocEntry) => {
      // プレビューは見出しの id へ直接スクロールする（スクロール同期の有無に依存しない）。
      // id は rehype-sanitize の DOM clobbering 対策で user-content- 接頭辞が付いている
      if (previewVisible && previewViewport) {
        const heading = document.getElementById(`user-content-${entry.id}`)
        if (heading && previewViewport.contains(heading)) {
          const offset =
            heading.getBoundingClientRect().top - previewViewport.getBoundingClientRect().top
          previewViewport.scrollBy({ top: offset - TOC_SCROLL_MARGIN_PX })
        }
      }

      if (!liveEditorView) return
      const doc = liveEditorView.state.doc
      const pos = doc.line(Math.min(Math.max(entry.line, 1), doc.lines)).from
      liveEditorView.dispatch({
        selection: { anchor: pos, head: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'start' }),
      })
      liveEditorView.focus()
    },
    [liveEditorView, previewViewport, previewVisible],
  )

  if (!activeDoc) {
    return (
      <div className="text-muted-foreground flex h-dvh items-center justify-center text-sm">
        読み込み中…
      </div>
    )
  }

  const charCount = activeDoc.content.length
  const lineCount = activeDoc.content.length === 0 ? 1 : activeDoc.content.split('\n').length
  const sourceLabel = getHandle(activeDoc.id)
    ? 'ローカルファイルに接続中'
    : '未接続（保存時にダウンロード）'

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      onDragOver={(event) => {
        event.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      <HighlightThemeStyle theme={resolvedTheme} />

      <AppHeader
        viewMode={effectiveViewMode}
        onViewModeChange={setViewMode}
        isMobile={isMobile}
        scrollSyncEnabled={scrollSyncEnabled}
        onScrollSyncChange={setScrollSyncEnabled}
        tocOpen={tocOpen}
        onTocToggle={() => setTocOpen((prev) => !prev)}
        onNewFile={handleNewFile}
        onOpenFile={() => void handleOpenFile()}
        onSave={handleSave}
        onSaveAs={() => void handleSaveAs()}
        onExportHtml={() => void handleExportHtml()}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />

      <FileTabsBar
        documents={documents}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={requestClose}
        onCreate={handleNewFile}
        onRename={renameDocument}
      />

      <EditorToolbar editorView={liveEditorView} />

      <div className="flex min-h-0 flex-1">
        {tocOpen && !isMobile && (
          <div className="border-border w-56 shrink-0 border-r">
            <TocPanel content={debouncedContent} onNavigate={handleTocNavigate} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <SplitPane
            mode={effectiveViewMode}
            left={
              <CodeEditor
                value={activeDoc.content}
                onChange={handleChange}
                theme={resolvedTheme}
                onCreateEditor={setEditorView}
              />
            }
            right={
              <ScrollArea className="h-full" viewportRef={setPreviewViewport}>
                <MarkdownPreview
                  ref={previewSnapshotRef}
                  content={debouncedContent}
                  className="mx-auto max-w-3xl px-6 py-6"
                />
              </ScrollArea>
            }
          />
        </div>
      </div>

      <StatusBar
        fileName={activeDoc.name}
        isDirty={isDocumentDirty(activeDoc)}
        charCount={charCount}
        lineCount={lineCount}
        sourceLabel={sourceLabel}
      />

      <ConfirmDialog
        open={pendingCloseId !== null}
        title="保存されていない変更があります"
        description="このタブを閉じると変更内容は失われます。閉じてもよろしいですか？"
        confirmLabel="閉じる"
        destructive
        onConfirm={() => {
          if (pendingCloseId) closeDocumentAction(pendingCloseId)
          setPendingCloseId(null)
        }}
        onCancel={() => setPendingCloseId(null)}
      />

      {isDraggingOver && (
        <div className="bg-background/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center text-lg font-medium backdrop-blur-sm">
          ファイルをドロップして開く
        </div>
      )}
    </div>
  )
}
