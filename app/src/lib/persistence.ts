import type { PersistedState } from '@/types/document'

const STORAGE_KEY = 'md-edit-and-viewer:documents:v1'

export function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.version !== 1 || !Array.isArray(parsed.documents)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 容量超過やプライベートモードでは自動保存を諦める（アプリ自体は継続動作）
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}
