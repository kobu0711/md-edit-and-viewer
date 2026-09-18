import { defaultSchema, type Schema } from 'hast-util-sanitize'

/**
 * react-markdown の既定サニタイズスキーマをベースに、以下の描画に必要な要素/属性のみ追加で許可する。
 * - rehype-katex（output: 'html'）が生成する span/svg/path と style 属性
 * - rehype-highlight が生成する code/span の className（トークン色分け）
 * - 見出しの id（rehype-slug）、行位置の data-line（スクロール同期用）
 * 追加した分だけ攻撃対象が広がるため、値は className/style の想定される範囲に限定している。
 */
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'svg', 'path'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'data*', 'style'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style', 'ariaHidden'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    svg: ['className', 'style', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns'],
    path: ['className', 'style', 'd', 'fill'],
    a: [...(defaultSchema.attributes?.a ?? []), 'className'],
    li: [...(defaultSchema.attributes?.li ?? []), 'className'],
    img: [...(defaultSchema.attributes?.img ?? []), 'className'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'data'],
  },
}
