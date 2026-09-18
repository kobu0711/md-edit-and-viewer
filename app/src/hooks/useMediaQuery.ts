import { useSyncExternalStore } from 'react'

function subscribe(query: string, onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(query)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false,
  )
}
