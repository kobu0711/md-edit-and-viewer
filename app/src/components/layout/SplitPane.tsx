import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

const STORAGE_KEY = 'md-edit-and-viewer:split-ratio'
const MIN_RATIO = 0.2
const MAX_RATIO = 0.8

function readStoredRatio(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(stored) && stored > MIN_RATIO && stored < MAX_RATIO ? stored : 0.5
  } catch {
    return 0.5
  }
}

export type ViewMode = 'editor' | 'preview' | 'split'

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  mode: ViewMode
}

export function SplitPane({ left, right, mode }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [ratio, setRatio] = useState(readStoredRatio)

  if (mode === 'editor') {
    return <div className="h-full min-h-0 min-w-0 flex-1">{left}</div>
  }
  if (mode === 'preview') {
    return <div className="h-full min-h-0 min-w-0 flex-1">{right}</div>
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const next = (event.clientX - rect.left) / rect.width
    setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)))
  }

  const handlePointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      localStorage.setItem(STORAGE_KEY, String(ratio))
    } catch {
      // 保存できなくても分割比が使えれば十分
    }
  }

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full">
      <div
        style={{ flexBasis: `${ratio * 100}%` }}
        className="h-full min-h-0 min-w-0 flex-shrink-0"
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="エディタとプレビューの境界"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="bg-border hover:bg-primary/50 active:bg-primary/70 relative w-1 flex-shrink-0 cursor-col-resize touch-none transition-colors"
      >
        <span className="absolute inset-y-0 -right-1.5 -left-1.5" />
      </div>
      <div style={{ flexBasis: `${(1 - ratio) * 100}%` }} className="h-full min-h-0 min-w-0 flex-1">
        {right}
      </div>
    </div>
  )
}
