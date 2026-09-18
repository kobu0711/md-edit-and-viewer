import { forwardRef, memo, type ComponentPropsWithoutRef } from 'react'
import Markdown from 'react-markdown'

import { CodeBlock } from '@/components/preview/CodeBlock'
import { markdownUrlTransform, rehypePlugins, remarkPlugins } from '@/lib/markdown/plugins'
import { cn } from '@/lib/utils'

function ExternalLink({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const isExternal = href ? /^[a-z]+:\/\//i.test(href) : false
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  )
}

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export const MarkdownPreview = memo(
  forwardRef<HTMLDivElement, MarkdownPreviewProps>(function MarkdownPreview(
    { content, className },
    ref,
  ) {
    return (
      <div ref={ref} className={cn('md-preview', className)} data-testid="markdown-preview">
        <Markdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          remarkRehypeOptions={{ footnoteLabel: '脚注', footnoteBackLabel: '本文に戻る' }}
          urlTransform={markdownUrlTransform}
          components={{ pre: CodeBlock, a: ExternalLink }}
        >
          {content}
        </Markdown>
      </div>
    )
  }),
)
