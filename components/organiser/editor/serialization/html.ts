import DOMPurify from 'isomorphic-dompurify'
import type { Editor } from '@tiptap/react'

export function getHTML(editor: Editor): string {
    return editor.getHTML()
}

export function setHTML(editor: Editor, html: string): void {
    editor.commands.setContent(DOMPurify.sanitize(html))
}

/** Rejects `javascript:`, `data:text/html`, and other script-bearing URL schemes. */
export function isSafeUrl(url: string): boolean {
    const trimmed = url.trim()
    if (!trimmed) return false
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return false
    if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('?')) return true
    try {
        const parsed = new URL(trimmed, 'https://placeholder.invalid')
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
    } catch {
        return false
    }
}
