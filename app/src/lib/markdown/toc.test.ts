import { describe, expect, it } from 'vitest'

import { extractToc } from '@/lib/markdown/toc'

describe('extractToc', () => {
  it('見出しを depth・テキスト・行番号付きで抽出する', () => {
    const markdown = ['# タイトル', '', '本文', '', '## 節見出し', '内容', ''].join('\n')

    const entries = extractToc(markdown)

    expect(entries).toEqual([
      { id: 'タイトル', depth: 1, text: 'タイトル', line: 1 },
      { id: '節見出し', depth: 2, text: '節見出し', line: 5 },
    ])
  })

  it('同名の見出しには github-slugger と同じ連番付き id を振る（rehype-slug と一致させる）', () => {
    const markdown = '# 概要\n\n## 概要\n'

    const entries = extractToc(markdown)

    expect(entries.map((entry) => entry.id)).toEqual(['概要', '概要-1'])
  })

  it('インライン装飾を除いたプレーンテキストを見出しラベルにする', () => {
    const markdown = '## **太字** と `コード`\n'

    const entries = extractToc(markdown)

    expect(entries[0].text).toBe('太字 と コード')
  })

  it('見出しがない場合は空配列を返す', () => {
    expect(extractToc('ただの本文です。')).toEqual([])
  })
})
