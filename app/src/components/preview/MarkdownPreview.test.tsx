import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { MarkdownPreview } from '@/components/preview/MarkdownPreview'
import { ThemeProvider } from '@/hooks/useTheme'

// CodeBlock（コードコピー UI）が内部で useTheme() を使うため、ThemeProvider でラップして描画する
function renderPreview(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe('MarkdownPreview', () => {
  it('本文中の生 <script> タグを実行可能な要素として描画しない', () => {
    const { container } = renderPreview(
      <MarkdownPreview content={'本文\n\n<script>alert(1)</script>\n'} />,
    )
    expect(container.querySelector('script')).toBeNull()
  })

  it('javascript: スキームのリンクは href を無害化する', () => {
    const { container } = renderPreview(
      <MarkdownPreview content={'[クリック](javascript:alert(1))'} />,
    )
    const link = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent === 'クリック',
    )
    expect(link).toBeDefined()
    expect(link?.getAttribute('href')).not.toBe('javascript:alert(1)')
  })

  it('data: スキームの画像はそのまま許可する（貼り付け画像の埋め込みに必要）', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo='
    const { container } = renderPreview(<MarkdownPreview content={`![画像](${dataUri})`} />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(dataUri)
  })

  it('GFM のテーブル・取り消し線・タスクリストを描画する', () => {
    const markdown = [
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '~~取り消し~~',
      '',
      '- [x] 完了',
      '- [ ] 未完了',
    ].join('\n')

    const { container } = renderPreview(<MarkdownPreview content={markdown} />)

    expect(container.querySelector('table')).not.toBeNull()
    expect(screen.getByText('取り消し').tagName).toBe('DEL')
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false)
  })

  it('見出しに id を付与する（TOC からのアンカー遷移用。DOM clobbering 対策の user-content- 接頭辞が付く）', () => {
    renderPreview(<MarkdownPreview content={'## 概要'} />)
    expect(screen.getByRole('heading', { level: 2, name: '概要' })).toHaveAttribute(
      'id',
      'user-content-概要',
    )
  })

  it('フェンス付きコードブロックにコピー用ボタンを表示する', () => {
    renderPreview(<MarkdownPreview content={'```js\nconsole.log(1)\n```'} />)
    expect(screen.getByRole('button', { name: 'コードをコピー' })).toBeInTheDocument()
  })
})
