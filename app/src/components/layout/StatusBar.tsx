interface StatusBarProps {
  fileName: string
  isDirty: boolean
  charCount: number
  lineCount: number
  sourceLabel: string
}

export function StatusBar({
  fileName,
  isDirty,
  charCount,
  lineCount,
  sourceLabel,
}: StatusBarProps) {
  return (
    <div className="border-border bg-muted/40 text-muted-foreground flex h-7 shrink-0 items-center gap-4 border-t px-3 text-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        {isDirty && (
          <span
            className="bg-primary size-1.5 shrink-0 rounded-full"
            aria-label="未保存の変更があります"
            title="未保存の変更があります"
          />
        )}
        <span className="text-foreground truncate font-medium">{fileName}</span>
      </span>
      <span className="hidden shrink-0 sm:inline">{sourceLabel}</span>
      <span className="ml-auto flex shrink-0 items-center gap-4 tabular-nums">
        <span>{charCount.toLocaleString('ja-JP')} 文字</span>
        <span>{lineCount.toLocaleString('ja-JP')} 行</span>
      </span>
    </div>
  )
}
