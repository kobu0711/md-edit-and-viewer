import type { EditorView } from '@codemirror/view'
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
  Table as TableIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  insertBulletList,
  insertHeading,
  insertLink,
  insertOrderedList,
  insertQuote,
  insertTable,
  insertTaskList,
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrikethrough,
} from '@/lib/editorCommands'

interface EditorToolbarProps {
  editorView: EditorView | null
}

interface ToolbarAction {
  label: string
  shortcut?: string
  icon: ComponentType<{ className?: string }>
  run: (view: EditorView) => void
}

const groups: ToolbarAction[][] = [
  [
    { label: '太字', shortcut: 'Ctrl+B', icon: Bold, run: toggleBold },
    { label: '斜体', shortcut: 'Ctrl+I', icon: Italic, run: toggleItalic },
    { label: '取り消し線', icon: Strikethrough, run: toggleStrikethrough },
  ],
  [
    { label: '見出し', icon: Heading2, run: insertHeading },
    { label: '引用', icon: Quote, run: insertQuote },
  ],
  [
    { label: 'リンク', shortcut: 'Ctrl+K', icon: LinkIcon, run: insertLink },
    { label: 'インラインコード', icon: Code, run: toggleInlineCode },
  ],
  [
    { label: '箇条書き', icon: List, run: insertBulletList },
    { label: '番号付きリスト', icon: ListOrdered, run: insertOrderedList },
    { label: 'タスクリスト', icon: ListChecks, run: insertTaskList },
  ],
  [{ label: '表を挿入', icon: TableIcon, run: insertTable }],
]

export function EditorToolbar({ editorView }: EditorToolbarProps) {
  return (
    <div className="border-border flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b px-2">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex shrink-0 items-center gap-0.5">
          {groupIndex > 0 && <Separator orientation="vertical" className="mx-1 h-5" />}
          {group.map(({ label, shortcut, icon: Icon, run }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={!editorView}
                  onClick={() => editorView && run(editorView)}
                  aria-label={label}
                >
                  <Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {label}
                {shortcut ? ` (${shortcut})` : ''}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  )
}
