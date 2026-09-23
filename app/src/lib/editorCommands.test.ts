import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'

import {
  detectListKind,
  insertBulletList,
  insertOrderedList,
  insertTaskList,
} from '@/lib/editorCommands'

let view: EditorView | null = null

function createView(doc: string, anchor = 0, head = anchor): EditorView {
  view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.single(anchor, head) }),
    parent: document.body,
  })
  return view
}

const text = (v: EditorView) => v.state.doc.toString()

afterEach(() => {
  view?.destroy()
  view = null
})

describe('detectListKind', () => {
  it('行頭の記号からリストの種類を判定する', () => {
    expect(detectListKind('- a')).toBe('bullet')
    expect(detectListKind('* a')).toBe('bullet')
    expect(detectListKind('  12. a')).toBe('ordered')
    expect(detectListKind('- [ ] a')).toBe('task')
    expect(detectListKind('- [x] a')).toBe('task')
    expect(detectListKind('ただの文')).toBeNull()
    expect(detectListKind('---')).toBeNull()
  })
})

describe('リスト系コマンド', () => {
  it('記号の無い行に箇条書きを付ける', () => {
    const v = createView('項目')
    insertBulletList(v)
    expect(text(v)).toBe('- 項目')
  })

  it('同じ種類をもう一度押すと記号を外す（トグル）', () => {
    const v = createView('- 項目')
    insertBulletList(v)
    expect(text(v)).toBe('項目')
  })

  it('箇条書きを番号付きリストに置き換える（記号が二重にならない）', () => {
    const v = createView('- 項目')
    insertOrderedList(v)
    expect(text(v)).toBe('1. 項目')
  })

  it('番号付きリストをタスクリストに置き換える', () => {
    const v = createView('3. 項目')
    insertTaskList(v)
    expect(text(v)).toBe('- [ ] 項目')
  })

  it('複数行を選択すると連番を振り直す', () => {
    const doc = 'a\n- b\nc'
    const v = createView(doc, 0, doc.length)
    insertOrderedList(v)
    expect(text(v)).toBe('1. a\n2. b\n3. c')
  })

  it('一部だけ同じ種類なら外さずに揃える', () => {
    const doc = '- a\nb'
    const v = createView(doc, 0, doc.length)
    insertBulletList(v)
    expect(text(v)).toBe('- a\n- b')
  })

  it('インデント（入れ子）を保ったまま置き換える', () => {
    const v = createView('  - 子項目')
    insertOrderedList(v)
    expect(text(v)).toBe('  1. 子項目')
  })

  it('空行ではカーソルが記号の後ろに来る', () => {
    const v = createView('')
    insertBulletList(v)
    expect(text(v)).toBe('- ')
    expect(v.state.selection.main.head).toBe(2)
  })
})
