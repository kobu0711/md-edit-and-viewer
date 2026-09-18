import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import { defaultUrlTransform, type UrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { PluggableList } from 'unified'

import { rehypeDataLine } from './rehypeDataLine'
import { markdownSanitizeSchema } from './sanitizeSchema'

export const remarkPlugins: PluggableList = [remarkGfm, remarkMath]

export const rehypePlugins: PluggableList = [
  rehypeSlug,
  [rehypeKatex, { output: 'html', throwOnError: false, strict: false }],
  [rehypeHighlight, { detect: false, ignoreMissing: true }],
  rehypeDataLine,
  [rehypeSanitize, markdownSanitizeSchema],
]

/**
 * react-markdown は既定で data:/blob: などの URL を丸ごと除去する（safeProtocol チェック）。
 * 貼り付け画像を data URI として埋め込む要件があるため、img の src に限り data:image/* を許可する。
 * それ以外（リンクの href 等）は react-markdown 既定の安全なプロトコルのみに制限したままにする。
 */
export const markdownUrlTransform: UrlTransform = (url, key) => {
  if (key === 'src' && url.startsWith('data:image/')) return url
  return defaultUrlTransform(url)
}
