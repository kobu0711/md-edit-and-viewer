import GithubSlugger from 'github-slugger'
import type { Root } from 'mdast'
import { toString as mdastToString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

export interface TocEntry {
  id: string
  depth: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  line: number
}

const tocParser = unified().use(remarkParse).use(remarkGfm)

/**
 * 見出し一覧を抽出する。id は rehype-slug と同じ github-slugger で生成するため、
 * プレビュー側の見出し id とクリック時のスクロール先が一致する。
 */
export function extractToc(markdown: string): TocEntry[] {
  const tree = tocParser.parse(markdown) as Root
  const slugger = new GithubSlugger()
  const entries: TocEntry[] = []

  visit(tree, 'heading', (node) => {
    const text = mdastToString(node)
    if (!text.trim()) return
    entries.push({
      id: slugger.slug(text),
      depth: node.depth as TocEntry['depth'],
      text,
      line: node.position?.start.line ?? 0,
    })
  })

  return entries
}
