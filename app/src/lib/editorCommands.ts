import { EditorSelection, type ChangeSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

function wrapSelection(view: EditorView, before: string, after: string, placeholder: string) {
  view.dispatch(
    view.state.changeByRange((range) => {
      const selectedText = view.state.sliceDoc(range.from, range.to)
      const text = selectedText || placeholder
      const insert = `${before}${text}${after}`
      const anchor = range.from + before.length
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(anchor, anchor + text.length),
      }
    }),
    { scrollIntoView: true },
  )
  view.focus()
}

function selectedLineNumbers(view: EditorView): number[] {
  const lineNumbers = new Set<number>()
  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number
    const endLine = view.state.doc.lineAt(range.to).number
    for (let n = startLine; n <= endLine; n += 1) lineNumbers.add(n)
  }
  return Array.from(lineNumbers).sort((a, b) => a - b)
}

function prefixLines(view: EditorView, prefix: string | ((lineIndex: number) => string)) {
  const sorted = selectedLineNumbers(view)
  const changes: ChangeSpec[] = sorted.map((lineNumber, index) => {
    const line = view.state.doc.line(lineNumber)
    const value = typeof prefix === 'function' ? prefix(index) : prefix
    return { from: line.from, to: line.from, insert: value }
  })
  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
}

export function toggleBold(view: EditorView): void {
  wrapSelection(view, '**', '**', '太字テキスト')
}

export function toggleItalic(view: EditorView): void {
  wrapSelection(view, '*', '*', '斜体テキスト')
}

export function toggleStrikethrough(view: EditorView): void {
  wrapSelection(view, '~~', '~~', '取り消し線')
}

export function toggleInlineCode(view: EditorView): void {
  wrapSelection(view, '`', '`', 'code')
}

export function insertHeading(view: EditorView): void {
  prefixLines(view, '## ')
}

export type ListKind = 'bullet' | 'ordered' | 'task'

// 先頭のインデントと、既存のリスト記号（タスク → 箇条書き → 番号の順に判定）
const LIST_MARKER = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/

export function detectListKind(lineText: string): ListKind | null {
  const marker = LIST_MARKER.exec(lineText)?.[2]
  if (!marker) return null
  if (/^[-*+]\s+\[/.test(marker)) return 'task'
  if (/^[-*+]/.test(marker)) return 'bullet'
  return 'ordered'
}

function listMarker(kind: ListKind, index: number): string {
  if (kind === 'ordered') return `${index + 1}. `
  if (kind === 'task') return '- [ ] '
  return '- '
}

/**
 * 選択行をリストにする。既に別種のリスト記号があれば置き換え、
 * 全行が同じ種類のリストなら記号を外す（トグル）。インデントは維持する。
 */
function toggleList(view: EditorView, kind: ListKind): void {
  const lines = selectedLineNumbers(view).map((n) => view.state.doc.line(n))
  const removing = lines.every((line) => detectListKind(line.text) === kind)

  const changes: ChangeSpec[] = lines.map((line, index) => {
    const match = LIST_MARKER.exec(line.text)
    const indent = match?.[1] ?? /^\s*/.exec(line.text)![0]
    const from = line.from + indent.length
    const to = from + (match?.[2].length ?? 0)
    return { from, to, insert: removing ? '' : listMarker(kind, index) }
  })

  // 行頭にあるカーソルを挿入した記号の後ろへ送る（既定の対応付けだと記号の手前に残る）
  const changeSet = view.state.changes(changes)
  view.dispatch({
    changes: changeSet,
    selection: view.state.selection.map(changeSet, 1),
    scrollIntoView: true,
  })
  view.focus()
}

export function insertBulletList(view: EditorView): void {
  toggleList(view, 'bullet')
}

export function insertOrderedList(view: EditorView): void {
  toggleList(view, 'ordered')
}

export function insertTaskList(view: EditorView): void {
  toggleList(view, 'task')
}

export function insertQuote(view: EditorView): void {
  prefixLines(view, '> ')
}

export function insertLink(view: EditorView): void {
  const range = view.state.selection.main
  const selectedText = view.state.sliceDoc(range.from, range.to)
  const label = selectedText || 'リンクテキスト'
  const url = 'https://'
  const insert = `[${label}](${url})`
  const urlStart = range.from + `[${label}](`.length
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(urlStart, urlStart + url.length),
    scrollIntoView: true,
  })
  view.focus()
}

export function insertTable(view: EditorView): void {
  const range = view.state.selection.main
  const line = view.state.doc.lineAt(range.to)
  const needsLeadingNewline = line.text.trim().length > 0
  const table = [
    '| 見出し1 | 見出し2 | 見出し3 |',
    '| --- | --- | --- |',
    '| 内容   | 内容   | 内容   |',
    '',
  ].join('\n')
  const insert = (needsLeadingNewline ? '\n' : '') + table
  view.dispatch({
    changes: { from: range.to, to: range.to, insert },
    scrollIntoView: true,
  })
  view.focus()
}
