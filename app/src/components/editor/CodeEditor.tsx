import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'

import { imagePasteExtension } from '@/lib/markdown/imagePaste'

import type { EditorState } from '@codemirror/state'

const editorLookAndFeel = EditorView.theme({
  '&': { fontSize: '14px', height: '100%', backgroundColor: 'transparent' },
  '.cm-content': { fontFamily: 'var(--font-mono)', paddingTop: '0.75rem', paddingBottom: '2rem' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--editor-gutter-foreground)',
    border: 'none',
  },
  '.cm-scroller': { overflow: 'auto' },
  '&.cm-focused': { outline: 'none' },
})

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
  onCreateEditor?: (view: EditorView, state: EditorState) => void
}

export function CodeEditor({ value, onChange, theme, onCreateEditor }: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      markdown({ codeLanguages: languages }),
      EditorView.lineWrapping,
      editorLookAndFeel,
      imagePasteExtension(),
    ],
    [],
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={onCreateEditor}
      theme={theme}
      height="100%"
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        tabSize: 2,
      }}
      placeholder="ここに Markdown を入力してください…"
      className="h-full text-sm"
    />
  )
}
