import { useMemo } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { extractToc } from '@/lib/markdown/toc'
import { cn } from '@/lib/utils'

interface TocPanelProps {
  content: string
  onNavigate: (line: number) => void
}

export function TocPanel({ content, onNavigate }: TocPanelProps) {
  const entries = useMemo(() => extractToc(content), [content])

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-xs">
        見出しがまだありません
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <nav className="space-y-0.5 p-2" aria-label="目次">
        {entries.map((entry) => (
          <button
            key={`${entry.line}-${entry.id}`}
            type="button"
            onClick={() => onNavigate(entry.line)}
            style={{ paddingLeft: `${(entry.depth - 1) * 0.85 + 0.5}rem` }}
            className={cn(
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground block w-full truncate rounded px-2 py-1 text-left text-xs',
              entry.depth === 1 && 'text-foreground font-medium',
            )}
            title={entry.text}
          >
            {entry.text}
          </button>
        ))}
      </nav>
    </ScrollArea>
  )
}
