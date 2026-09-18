import type { Element } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import { Check, Copy } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef } from 'react'

import { Mermaid } from '@/components/preview/Mermaid'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

type PreProps = ComponentPropsWithoutRef<'pre'> & { node?: Element }

function findCodeElement(node: Element | undefined): Element | undefined {
  return node?.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code',
  )
}

function languageOf(codeNode: Element | undefined): string | undefined {
  const classNames = (codeNode?.properties?.className as string[] | undefined) ?? []
  const languageClass = classNames.find((name) => name.startsWith('language-'))
  return languageClass?.replace('language-', '')
}

/** react-markdown の `pre` 置き換え。フェンス付きコードブロックにコピー UI を付け、
 * `language-mermaid` の場合は Mermaid 図として描画する。 */
export function CodeBlock({ node, children, className, ...props }: PreProps) {
  const { resolvedTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const codeNode = findCodeElement(node)
  const language = languageOf(codeNode)
  const rawText = codeNode ? hastToString(codeNode) : ''

  if (language === 'mermaid') {
    return <Mermaid key={rawText} code={rawText} theme={resolvedTheme} />
  }

  const handleCopy = () => {
    navigator.clipboard
      .writeText(rawText)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // クリップボード権限がない環境では静かに失敗させる
      })
  }

  return (
    <div className="group/code relative my-4">
      {language && (
        <span className="text-muted-foreground pointer-events-none absolute top-2 left-3 z-10 text-[11px] font-medium select-none">
          {language}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="border-border/60 bg-card/90 text-muted-foreground hover:text-foreground absolute top-1.5 right-2 z-10 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs opacity-0 backdrop-blur transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        aria-label="コードをコピー"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'コピーしました' : 'コピー'}
      </button>
      <pre
        className={cn('bg-code-background overflow-x-auto rounded-lg p-4 pt-8 text-sm', className)}
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}
