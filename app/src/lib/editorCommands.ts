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

function prefixLines(view: EditorView, prefix: string | ((lineIndex: number) => string)) {
  const lineNumbers = new Set<number>()
  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number
    const endLine = view.state.doc.lineAt(range.to).number
    for (let n = startLine; n <= endLine; n += 1) lineNumbers.add(n)
  }
  const sorted = Array.from(lineNumbers).sort((a, b) => a - b)
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

export function insertBulletList(view: EditorView): void {
  prefixLines(view, '- ')
}

export function insertOrderedList(view: EditorView): void {
  prefixLines(view, (index) => `${index + 1}. `)
}

export function insertTaskList(view: EditorView): void {
  prefixLines(view, '- [ ] ')
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
