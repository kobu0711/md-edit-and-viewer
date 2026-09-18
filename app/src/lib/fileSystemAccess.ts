const MARKDOWN_ACCEPT: FilePickerAcceptType = {
  description: 'Markdown',
  accept: {
    'text/markdown': ['.md', '.markdown', '.mdx'],
  },
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

export interface OpenedFile {
  name: string
  content: string
  handle: FileSystemFileHandle | null
}

/** File System Access API 対応ブラウザでファイル選択ダイアログを開く。複数選択可。 */
export async function openFilesWithPicker(): Promise<OpenedFile[]> {
  if (!window.showOpenFilePicker) {
    throw new Error('File System Access API に対応していません')
  }
  const handles = await window.showOpenFilePicker({
    multiple: true,
    types: [MARKDOWN_ACCEPT],
    excludeAcceptAllOption: false,
  })
  return Promise.all(
    handles.map(async (handle) => {
      const file = await handle.getFile()
      const content = await file.text()
      return { name: file.name, content, handle }
    }),
  )
}

/** <input type="file"> フォールバック。1つの hidden input から選択結果を Promise で受け取る。 */
export function openFilesWithInput(): Promise<OpenedFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.mdx,text/markdown,text/plain'
    input.multiple = true
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await file.text(),
          handle: null,
        })),
      )
        .then(resolve)
        .catch(reject)
        .finally(() => input.remove())
    })
    input.addEventListener('cancel', () => {
      resolve([])
      input.remove()
    })

    document.body.appendChild(input)
    input.click()
  })
}

export async function openFiles(): Promise<OpenedFile[]> {
  if (isFileSystemAccessSupported()) {
    try {
      return await openFilesWithPicker()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return []
      }
      throw error
    }
  }
  return openFilesWithInput()
}

/** ドラッグ&ドロップされた DataTransfer からファイル内容を読み込む（handle は取得しない）。 */
export async function readDroppedFiles(dataTransfer: DataTransfer): Promise<OpenedFile[]> {
  const files = Array.from(dataTransfer.files).filter((file) => {
    const lower = file.name.toLowerCase()
    return (
      lower.endsWith('.md') ||
      lower.endsWith('.markdown') ||
      lower.endsWith('.mdx') ||
      file.type === 'text/markdown' ||
      file.type === 'text/plain' ||
      file.type === ''
    )
  })
  return Promise.all(
    files.map(async (file) => ({ name: file.name, content: await file.text(), handle: null })),
  )
}

async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

/** File System Access のハンドルへ上書き保存する。 */
export async function writeToHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
  const granted = await ensureWritePermission(handle)
  if (!granted) {
    throw new Error('ファイルへの書き込み権限がありません')
  }
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** 「名前を付けて保存」ダイアログを開き、新しいハンドルへ保存する。 */
export async function saveAsWithPicker(
  suggestedName: string,
  content: string,
): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) {
    throw new Error('File System Access API に対応していません')
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [MARKDOWN_ACCEPT],
    })
    await writeToHandle(handle, content)
    return handle
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
}

/** <a download> によるブラウザダウンロード（File System Access 非対応時のフォールバック）。 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
