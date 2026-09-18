import katexCssRaw from 'katex/dist/katex.min.css?inline'

import { highlightThemeCss } from '@/lib/markdown/highlightThemes'

/**
 * index.css の :root / .dark 変数と .md-preview ルールの複製。
 * 書き出す HTML はアプリの CSS ビルドに依存できないため、見た目を揃えるためにここへ複製している。
 * index.css の該当ブロックを変更した場合はこちらも合わせて更新すること。
 */
const EXPORT_BASE_CSS = `
:root {
  --background: #ffffff; --foreground: #1c1f26; --border: #dcdfe4; --muted: #f1f2f4;
  --muted-foreground: #6b7280; --primary: #3457a6; --code-background: #f4f5f7;
}
.dark {
  --background: #1a1c22; --foreground: #eceef1; --border: #33353d; --muted: #26282f;
  --muted-foreground: #9aa0ab; --primary: #9db4e8; --code-background: #202329;
}
html { color-scheme: light dark; }
body { margin: 0; background: var(--background); color: var(--foreground); }
.md-preview { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem 4rem; font-family: ui-sans-serif, system-ui, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', Meiryo, sans-serif; line-height: 1.75; font-size: 16px; }
.md-preview > :first-child { margin-top: 0; }
.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4, .md-preview h5, .md-preview h6 { font-weight: 600; line-height: 1.3; margin-top: 1.75em; margin-bottom: 0.75em; }
.md-preview h1 { font-size: 1.75em; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
.md-preview h2 { font-size: 1.4em; padding-bottom: 0.25em; border-bottom: 1px solid var(--border); }
.md-preview h3 { font-size: 1.2em; }
.md-preview p, .md-preview ul, .md-preview ol, .md-preview blockquote, .md-preview table { margin-top: 0; margin-bottom: 1em; }
.md-preview ul, .md-preview ol { padding-left: 1.6em; }
.md-preview li + li { margin-top: 0.25em; }
.md-preview a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
.md-preview hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.md-preview blockquote { border-left: 3px solid var(--border); padding-left: 1em; color: var(--muted-foreground); }
.md-preview img { max-width: 100%; border-radius: 0.375rem; }
.md-preview table { border-collapse: collapse; width: 100%; font-size: 0.9em; display: block; overflow-x: auto; }
.md-preview th, .md-preview td { border: 1px solid var(--border); padding: 0.45em 0.75em; text-align: left; }
.md-preview thead th { background: var(--muted); font-weight: 600; }
.md-preview code { background: var(--code-background); border-radius: 0.25rem; padding: 0.15em 0.4em; font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; font-size: 0.875em; }
.md-preview pre code { background: transparent; padding: 0; font-size: 0.85em; }
.md-preview pre { background: var(--code-background); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; }
.md-preview .footnotes { margin-top: 2.5em; padding-top: 1em; border-top: 1px solid var(--border); font-size: 0.875em; color: var(--muted-foreground); }
.md-preview .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.25em 0; }
.md-preview .mermaid-diagram { display: flex; justify-content: center; margin: 1em 0; overflow-x: auto; }
`.trim()

async function toDataUri(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** CSS 内の url(...) 参照（主にフォント）を data URI に置き換え、単体ファイルとして開ける状態にする。 */
async function inlineCssUrls(cssText: string, baseUrl: string): Promise<string> {
  const urlPattern = /url\((['"]?)([^'")]+)\1\)/g
  const found = new Set<string>()
  for (const match of cssText.matchAll(urlPattern)) {
    if (!match[2].startsWith('data:')) found.add(match[2])
  }

  let result = cssText
  await Promise.all(
    Array.from(found).map(async (relativeUrl) => {
      try {
        const absolute = new URL(relativeUrl, baseUrl).href
        const dataUri = await toDataUri(absolute)
        result = result.split(relativeUrl).join(dataUri)
      } catch {
        // 取得できないフォント等は元の参照のまま残す（表示が多少崩れる可能性はあるが致命的ではない）
      }
    }),
  )
  return result
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface ExportHtmlOptions {
  previewElement: HTMLElement
  title: string
  theme: 'light' | 'dark'
}

/** 現在描画中のプレビュー DOM をスナップショットし、スタイル込みの単一 HTML として書き出す。 */
export async function buildStandaloneHtml({
  previewElement,
  title,
  theme,
}: ExportHtmlOptions): Promise<string> {
  const baseUrl = document.baseURI
  const [katexCss, highlightCss] = await Promise.all([
    inlineCssUrls(katexCssRaw, baseUrl),
    Promise.resolve(highlightThemeCss[theme]),
  ])

  const bodyHtml = previewElement.outerHTML

  return `<!doctype html>
<html lang="ja" class="${theme === 'dark' ? 'dark' : ''}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>${katexCss}</style>
<style>${highlightCss}</style>
<style>${EXPORT_BASE_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

export function downloadHtmlFile(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
