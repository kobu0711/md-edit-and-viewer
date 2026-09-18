import { Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { EditorDocument } from '@/types/document'
import { isDocumentDirty } from '@/types/document'

interface FileTabsBarProps {
  documents: EditorDocument[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
}

function TabRename({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit: (next: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const trimmed = draft.trim()
      if (trimmed) onCommit(trimmed)
      else onCancel()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const trimmed = draft.trim()
        if (trimmed && trimmed !== value) onCommit(trimmed)
        else onCancel()
      }}
      onClick={(event) => event.stopPropagation()}
      className="ring-primary w-28 rounded bg-transparent px-0.5 text-sm ring-1 outline-none"
    />
  )
}

export function FileTabsBar({
  documents,
  activeId,
  onSelect,
  onClose,
  onCreate,
  onRename,
}: FileTabsBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)

  return (
    <div className="border-border bg-muted/30 flex h-9 shrink-0 items-center border-b">
      <ScrollArea className="min-w-0 flex-1">
        <div className="flex items-stretch">
          {documents.map((doc) => {
            const active = doc.id === activeId
            const dirty = isDocumentDirty(doc)
            return (
              <div
                key={doc.id}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(doc.id)
                }}
                onDoubleClick={() => setRenamingId(doc.id)}
                className={cn(
                  'group border-border flex h-9 max-w-48 min-w-24 shrink-0 cursor-default items-center gap-1.5 border-r px-3 text-sm select-none',
                  active
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                )}
              >
                {renamingId === doc.id ? (
                  <TabRename
                    value={doc.name}
                    onCommit={(next) => {
                      onRename(doc.id, next)
                      setRenamingId(null)
                    }}
                    onCancel={() => setRenamingId(null)}
                  />
                ) : (
                  <span className="truncate" title={doc.name}>
                    {doc.name}
                  </span>
                )}
                {dirty && renamingId !== doc.id && (
                  <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />
                )}
                <button
                  type="button"
                  aria-label={`${doc.name} を閉じる`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose(doc.id)
                  }}
                  className="hover:bg-accent ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mx-1 size-7 shrink-0"
        onClick={onCreate}
        aria-label="新規タブ"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}
