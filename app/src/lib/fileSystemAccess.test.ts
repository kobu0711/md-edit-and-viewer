import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  downloadTextFile,
  isFileSystemAccessSupported,
  readDroppedFiles,
} from '@/lib/fileSystemAccess'

function makeDataTransfer(files: File[]): DataTransfer {
  return {
    files: files as unknown as FileList,
  } as unknown as DataTransfer
}

describe('isFileSystemAccessSupported', () => {
  afterEach(() => {
    delete window.showOpenFilePicker
  })

  it('showOpenFilePicker が存在しない環境では false を返す（jsdom や Firefox）', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('showOpenFilePicker が存在する環境では true を返す（Chrome/Edge）', () => {
    window.showOpenFilePicker = vi.fn()
    expect(isFileSystemAccessSupported()).toBe(true)
  })
})

describe('readDroppedFiles', () => {
  it('.md / .markdown / .mdx のみを取り込み、内容を読み込む', async () => {
    const files = [
      new File(['# a'], 'a.md', { type: 'text/markdown' }),
      new File(['b content'], 'b.markdown', { type: '' }),
      new File(['c content'], 'c.mdx', { type: '' }),
      new File(['ignored'], 'photo.png', { type: 'image/png' }),
    ]

    const result = await readDroppedFiles(makeDataTransfer(files))

    expect(result.map((f) => f.name)).toEqual(['a.md', 'b.markdown', 'c.mdx'])
    expect(result[0].content).toBe('# a')
    expect(result.every((f) => f.handle === null)).toBe(true)
  })

  it('対象拡張子のファイルが無ければ空配列を返す', async () => {
    const files = [new File(['x'], 'archive.zip', { type: 'application/zip' })]
    const result = await readDroppedFiles(makeDataTransfer(files))
    expect(result).toEqual([])
  })
})

describe('downloadTextFile', () => {
  it('Blob URL を生成してアンカー経由でダウンロードし、後始末する', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('memo.md', '# メモ')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
  })
})
