import githubDark from 'highlight.js/styles/github-dark.css?inline'
import githubLight from 'highlight.js/styles/github.css?inline'

/** ライト/ダークで切り替えるコードハイライトテーマの CSS（文字列）。
 * `<style>` タグへ動的に流し込んで使う。HTML エクスポート時にも同じ文字列を埋め込む。 */
export const highlightThemeCss = {
  light: githubLight,
  dark: githubDark,
} as const
