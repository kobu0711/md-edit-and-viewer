import { EditorView } from '@codemirror/view'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * 画像をクリップボードから貼り付けたときに data URI の Markdown 画像記法として挿入する。
 * サーバー保存を行わない設計のため、画像はファイル内に直接埋め込む。
 */
export function imagePasteExtension() {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items
      if (!items) return false
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
      if (!imageItem) return false
      const file = imageItem.getAsFile()
      if (!file) return false

      event.preventDefault()
      readAsDataUrl(file)
        .then((dataUrl) => {
          const insert = `![画像](${dataUrl})\n`
          const { from, to } = view.state.selection.main
          view.dispatch({ changes: { from, to, insert }, scrollIntoView: true })
        })
        .catch(() => {
          // 読み込み失敗時は何もしない（貼り付け自体はキャンセル済み）
        })
      return true
    },
  })
}
