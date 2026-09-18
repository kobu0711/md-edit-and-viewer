import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearPersistedState, loadPersistedState, savePersistedState } from '@/lib/persistence'
import type { PersistedState } from '@/types/document'

const sample: PersistedState = {
  version: 1,
  activeId: 'doc-1',
  documents: [
    {
      id: 'doc-1',
      name: '無題.md',
      content: '# hello',
      savedContent: '',
      sourceKind: 'plain',
      createdAt: 1000,
    },
  ],
}

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存した内容をそのまま復元できる', () => {
    savePersistedState(sample)
    expect(loadPersistedState()).toEqual(sample)
  })

  it('未保存（localStorage が空）の場合は null を返す', () => {
    expect(loadPersistedState()).toBeNull()
  })

  it('壊れた JSON が保存されていても例外を投げず null を返す', () => {
    localStorage.setItem('md-edit-and-viewer:documents:v1', '{not valid json')
    expect(loadPersistedState()).toBeNull()
  })

  it('version が異なるデータは復元しない（将来のスキーマ変更に備える）', () => {
    localStorage.setItem(
      'md-edit-and-viewer:documents:v1',
      JSON.stringify({ ...sample, version: 999 }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it('clearPersistedState で保存内容を消せる', () => {
    savePersistedState(sample)
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
  })

  it('localStorage が書き込みエラーを投げても例外を外に漏らさない（容量超過等）', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => savePersistedState(sample)).not.toThrow()
    setItemSpy.mockRestore()
  })
})
