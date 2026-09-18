import { highlightThemeCss } from '@/lib/markdown/highlightThemes'

/** 現在のテーマに応じたシンタックスハイライト用 CSS を <style> に差し込む。 */
export function HighlightThemeStyle({ theme }: { theme: 'light' | 'dark' }) {
  return <style data-highlight-theme={theme}>{highlightThemeCss[theme]}</style>
}
