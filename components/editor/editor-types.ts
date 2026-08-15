export interface RichTextEditorProps {
    content: string
    onChange: (html: string) => void
    placeholder?: string
    /** Disables editing and hides the toolbar/plugins — used for read-only previews. */
    readOnly?: boolean
}

export interface RichTextEditorRef {
    focus: () => void
    clear: () => void
    getHTML: () => string
    setHTML: (html: string) => void
    getMarkdown: () => string
    setMarkdown: (markdown: string) => void
    getJSON: () => Record<string, unknown>
    isEmpty: () => boolean
}

export type EditorMode = 'visual' | 'html' | 'markdown'
