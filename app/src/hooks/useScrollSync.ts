import type { EditorView } from '@codemirror/view'
import { useEffect } from 'react'

import { lineForTop, topForLine, type LinePosition } from '@/lib/scrollMapping'

interface UseScrollSyncOptions {
  editorView: EditorView | null
  previewViewport: HTMLDivElement | null
  enabled: boolean
}

type Pane = 'editor' | 'preview'

/** 無操作でこの時間が経つと駆動権を手放す（次の操作を新しいジェスチャとして扱う） */
const DRIVER_IDLE_MS = 200
/** 追従側へ書き込んだ直後、その scroll イベントを無視する時間 */
const SUPPRESS_MS = 250

function maxScrollTop(element: HTMLElement): number {
  return Math.max(0, element.scrollHeight - element.clientHeight)
}

/** プレビュー内の data-line 要素から行↔位置の対応表を作る。offsetParent に依存しない計測を使う。 */
function buildLineMap(viewport: HTMLElement): LinePosition[] {
  const viewportTop = viewport.getBoundingClientRect().top
  const scrollTop = viewport.scrollTop
  const positions: LinePosition[] = []

  for (const element of viewport.querySelectorAll<HTMLElement>('[data-line]')) {
    const line = Number(element.dataset.line)
    if (!Number.isFinite(line)) continue

    const top = element.getBoundingClientRect().top - viewportTop + scrollTop
    const previous = positions[positions.length - 1]
    // 入れ子要素などで行/位置が逆行する点は捨て、単調増加を保つ（二分探索の前提）
    if (previous && (line <= previous.line || top <= previous.top)) continue
    positions.push({ line, top })
  }

  return positions
}

/** エディタの表示上端に対応する行番号。小数部は行ブロック内の位置（折り返し行にも対応）。 */
function editorLineAtScroll(view: EditorView): number {
  const scrollTop = view.scrollDOM.scrollTop
  const block = view.lineBlockAtHeight(scrollTop)
  const line = view.state.doc.lineAt(block.from)
  const fraction =
    block.height > 0 ? Math.min(Math.max((scrollTop - block.top) / block.height, 0), 1) : 0
  return line.number + fraction
}

/** 行番号（小数可）をエディタのスクロール位置に変換する。 */
function editorScrollForLine(view: EditorView, lineFloat: number): number {
  const doc = view.state.doc
  const lineNumber = Math.min(Math.max(Math.floor(lineFloat), 1), doc.lines)
  const block = view.lineBlockAt(doc.line(lineNumber).from)
  const fraction = Math.min(Math.max(lineFloat - lineNumber, 0), 1)
  return block.top + fraction * block.height
}

/**
 * エディタとプレビューのスクロール位置を data-line 属性を介して同期する。
 *
 * 操作したペインが「駆動権」を持ち、追従側のスクロールイベントは書き込み直後の一定時間だけ
 * 無視する。判定はすべて performance.now() ベースで、requestAnimationFrame に依存しない
 * （非表示タブでは rAF が止まり、解除待ちのまま同期が停止してしまうため）。
 */
export function useScrollSync({
  editorView,
  previewViewport,
  enabled,
}: UseScrollSyncOptions): void {
  useEffect(() => {
    if (!enabled || !editorView || !previewViewport) return

    const editorScroller = editorView.scrollDOM
    let driver: Pane | null = null
    let driverUntil = 0
    const suppressUntil: Record<Pane, number> = { editor: 0, preview: 0 }
    let lineMap: LinePosition[] = []
    let lineMapScrollHeight = -1

    /** 自分が駆動側として動いてよいか判定し、必要なら対応表を作り直す。 */
    const claimDriver = (pane: Pane, now: number): boolean => {
      // 直前に自分が書き込まれた分の scroll イベントは、ユーザー操作と区別できないので無視する
      if (now < suppressUntil[pane]) return false
      if (driver !== null && driver !== pane && now < driverUntil) return false

      const isNewGesture = driver !== pane || now >= driverUntil
      if (isNewGesture || previewViewport.scrollHeight !== lineMapScrollHeight) {
        lineMap = buildLineMap(previewViewport)
        lineMapScrollHeight = previewViewport.scrollHeight
      }

      driver = pane
      driverUntil = now + DRIVER_IDLE_MS
      return true
    }

    const applyScroll = (target: HTMLElement, pane: Pane, top: number, now: number) => {
      const clamped = Math.min(Math.max(top, 0), maxScrollTop(target))
      if (Math.abs(target.scrollTop - clamped) < 1) return
      suppressUntil[pane] = now + SUPPRESS_MS
      target.scrollTop = clamped
    }

    const handleEditorScroll = () => {
      const now = performance.now()
      if (!claimDriver('editor', now) || lineMap.length === 0) return

      // 端まで送ったときは追従側も端に合わせる（先頭/末尾のブロックが揃わないのを防ぐ）
      if (editorScroller.scrollTop <= 0) {
        applyScroll(previewViewport, 'preview', 0, now)
        return
      }
      if (editorScroller.scrollTop >= maxScrollTop(editorScroller) - 1) {
        applyScroll(previewViewport, 'preview', maxScrollTop(previewViewport), now)
        return
      }

      const top = topForLine(lineMap, editorLineAtScroll(editorView))
      if (top !== null) applyScroll(previewViewport, 'preview', top, now)
    }

    const handlePreviewScroll = () => {
      const now = performance.now()
      if (!claimDriver('preview', now) || lineMap.length === 0) return

      if (previewViewport.scrollTop <= 0) {
        applyScroll(editorScroller, 'editor', 0, now)
        return
      }
      if (previewViewport.scrollTop >= maxScrollTop(previewViewport) - 1) {
        applyScroll(editorScroller, 'editor', maxScrollTop(editorScroller), now)
        return
      }

      const lineFloat = lineForTop(lineMap, previewViewport.scrollTop)
      if (lineFloat === null) return
      applyScroll(editorScroller, 'editor', editorScrollForLine(editorView, lineFloat), now)
    }

    editorScroller.addEventListener('scroll', handleEditorScroll, { passive: true })
    previewViewport.addEventListener('scroll', handlePreviewScroll, { passive: true })

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      previewViewport.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorView, previewViewport, enabled])
}
