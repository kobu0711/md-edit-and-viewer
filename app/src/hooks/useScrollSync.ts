import type { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'

interface UseScrollSyncOptions {
  editorView: EditorView | null
  previewViewport: HTMLDivElement | null
  enabled: boolean
}

/**
 * エディタとプレビューのスクロール位置を data-line 属性を介して同期する。
 * 片方の操作でもう片方を動かした際に無限ループにならないよう、
 * 同期の発生源を1フレームだけ記録して抑制する。
 */
export function useScrollSync({
  editorView,
  previewViewport,
  enabled,
}: UseScrollSyncOptions): void {
  const syncingFrom = useRef<'editor' | 'preview' | null>(null)

  useEffect(() => {
    if (!enabled || !editorView || !previewViewport) return

    const handleEditorScroll = () => {
      if (syncingFrom.current === 'preview') return
      syncingFrom.current = 'editor'

      const scrollDOM = editorView.scrollDOM
      const block = editorView.lineBlockAtHeight(scrollDOM.scrollTop)
      const line = editorView.state.doc.lineAt(block.from).number

      const targets = Array.from(previewViewport.querySelectorAll<HTMLElement>('[data-line]'))
      let target: HTMLElement | null = null
      for (const el of targets) {
        const elLine = Number(el.dataset.line)
        if (elLine <= line) target = el
        else break
      }
      target ??= targets[0] ?? null
      if (target) {
        previewViewport.scrollTop = target.offsetTop - previewViewport.offsetTop
      }

      requestAnimationFrame(() => {
        syncingFrom.current = null
      })
    }

    const handlePreviewScroll = () => {
      if (syncingFrom.current === 'editor') return
      syncingFrom.current = 'preview'

      const containerTop = previewViewport.getBoundingClientRect().top
      const targets = Array.from(previewViewport.querySelectorAll<HTMLElement>('[data-line]'))
      let target: HTMLElement | null = null
      for (const el of targets) {
        if (el.getBoundingClientRect().bottom >= containerTop) {
          target = el
          break
        }
      }

      const line = target ? Number(target.dataset.line) : 1
      const clampedLine = Math.min(Math.max(line, 1), editorView.state.doc.lines)
      const pos = editorView.state.doc.line(clampedLine).from
      const block = editorView.lineBlockAt(pos)
      editorView.scrollDOM.scrollTop = block.top

      requestAnimationFrame(() => {
        syncingFrom.current = null
      })
    }

    const scrollDOM = editorView.scrollDOM
    scrollDOM.addEventListener('scroll', handleEditorScroll, { passive: true })
    previewViewport.addEventListener('scroll', handlePreviewScroll, { passive: true })

    return () => {
      scrollDOM.removeEventListener('scroll', handleEditorScroll)
      previewViewport.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorView, previewViewport, enabled])
}
