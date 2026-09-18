import {
  Columns2,
  Download,
  FileEdit,
  FilePlus,
  FileText,
  FolderOpen,
  ListTree,
  Monitor,
  Moon,
  PanelLeft,
  Save,
  Sun,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ViewMode } from '@/components/layout/SplitPane'
import type { ThemeMode } from '@/hooks/useTheme'

interface AppHeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isMobile: boolean
  scrollSyncEnabled: boolean
  onScrollSyncChange: (enabled: boolean) => void
  tocOpen: boolean
  onTocToggle: () => void
  onNewFile: () => void
  onOpenFile: () => void
  onSave: () => void
  onSaveAs: () => void
  onExportHtml: () => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'system', label: 'システム', icon: Monitor },
]

export function AppHeader({
  viewMode,
  onViewModeChange,
  isMobile,
  scrollSyncEnabled,
  onScrollSyncChange,
  tocOpen,
  onTocToggle,
  onNewFile,
  onOpenFile,
  onSave,
  onSaveAs,
  onExportHtml,
  themeMode,
  onThemeModeChange,
}: AppHeaderProps) {
  const CurrentThemeIcon =
    themeOptions.find((option) => option.value === themeMode)?.icon ?? Monitor

  return (
    <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      <div className="flex items-center gap-1.5 pr-1 font-semibold">
        <FileText className="text-primary size-4" />
        <span className="hidden text-sm sm:inline">Markdown エディタ</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            ファイル
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onNewFile}>
            <FilePlus className="size-4" />
            新規作成
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenFile}>
            <FolderOpen className="size-4" />
            開く…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSave}>
            <Save className="size-4" />
            保存
            <span className="text-muted-foreground ml-auto text-xs">Ctrl+S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSaveAs}>
            <FileEdit className="size-4" />
            名前を付けて保存…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onExportHtml}>
            <Download className="size-4" />
            HTML としてエクスポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={tocOpen ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            onClick={onTocToggle}
            aria-pressed={tocOpen}
            aria-label="目次を切り替え"
          >
            <ListTree className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>目次</TooltipContent>
      </Tooltip>

      <div className="ml-auto flex items-center gap-3">
        {!isMobile && (
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <Switch checked={scrollSyncEnabled} onCheckedChange={onScrollSyncChange} />
            スクロール同期
          </label>
        )}

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
        >
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="editor" aria-label="エディタのみ">
                  <PanelLeft className="size-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>エディタのみ</TooltipContent>
            </Tooltip>
          )}
          {isMobile && (
            <ToggleGroupItem value="editor" aria-label="編集">
              編集
            </ToggleGroupItem>
          )}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="split" aria-label="分割表示">
                  <Columns2 className="size-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>分割表示</TooltipContent>
            </Tooltip>
          )}
          {isMobile && (
            <ToggleGroupItem value="preview" aria-label="プレビュー">
              プレビュー
            </ToggleGroupItem>
          )}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="preview" aria-label="プレビューのみ">
                  <FileText className="size-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>プレビューのみ</TooltipContent>
            </Tooltip>
          )}
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="テーマ"
            >
              <CurrentThemeIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem key={value} onSelect={() => onThemeModeChange(value)}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
