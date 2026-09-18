import { useEffect, useId, useRef, useState } from 'react'

import type { Mermaid as MermaidApi } from 'mermaid'

// mermaid（+ ELK レイアウトエンジン）は非常に大きいため、実際に mermaid ブロックが
// 描画されるまで動的 import で読み込みを遅延する（メインバンドルの肥大化を防ぐ）。
let mermaidModulePromise: Promise<MermaidApi> | null = null
function loadMermaid(): Promise<MermaidApi> {
  mermaidModulePromise ??= import('mermaid').then((mod) => mod.default)
  return mermaidModulePromise
}

let initializedTheme: 'light' | 'dark' | null = null
async function ensureInitialized(theme: 'light' | 'dark'): Promise<MermaidApi> {
  const mermaid = await loadMermaid()
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      fontFamily: 'inherit',
    })
    initializedTheme = theme
  }
  return mermaid
}

interface MermaidProps {
  code: string
  theme: 'light' | 'dark'
}

export function Mermaid({ code, theme }: MermaidProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ensureInitialized(theme)
      .then((mermaid) => mermaid.render(`mermaid-${reactId}`, code))
      .then(({ svg, bindFunctions }) => {
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
        bindFunctions?.(containerRef.current)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Mermaid の描画に失敗しました')
      })

    return () => {
      cancelled = true
    }
  }, [code, theme, reactId])

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive my-4 rounded-md border p-3 text-xs whitespace-pre-wrap">
        Mermaid 図の描画エラー: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram my-4 flex justify-center overflow-x-auto [&_svg]:max-w-full"
    />
  )
}
