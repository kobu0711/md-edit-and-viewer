import type { Element, Root } from 'hast'
import { visit } from 'unist-util-visit'

/** スクロール同期の対象とするブロックレベル要素。過剰な付与を避けるため絞り込む。 */
const SYNC_TARGET_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'pre',
  'table',
  'hr',
])

/**
 * ソース上の開始行を data-line 属性としてブロック要素に埋め込む rehype プラグイン。
 * エディタ⇄プレビューのスクロール同期はこの属性を頼りに対応行を探す。
 */
export function rehypeDataLine() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!SYNC_TARGET_TAGS.has(node.tagName)) return
      const line = node.position?.start.line
      if (line != null) {
        node.properties['data-line'] = line
      }
    })
  }
}
