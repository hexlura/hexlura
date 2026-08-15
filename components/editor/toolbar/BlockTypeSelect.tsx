'use client'

import type { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'
import { useToolbarState } from './useToolbarState'

const BLOCK_TYPES = [
    { label: 'Paragraph', value: 'paragraph' },
    { label: 'Heading 1', value: 'h1' },
    { label: 'Heading 2', value: 'h2' },
    { label: 'Heading 3', value: 'h3' },
    { label: 'Heading 4', value: 'h4' },
    { label: 'Heading 5', value: 'h5' },
    { label: 'Heading 6', value: 'h6' },
    { label: 'Quote', value: 'blockquote' },
] as const

export function BlockTypeSelect({ editor }: { editor: Editor }) {
    const state = useToolbarState(editor)
    const value = state.heading1 ? 'h1'
        : state.heading2 ? 'h2'
        : state.heading3 ? 'h3'
        : state.heading4 ? 'h4'
        : state.heading5 ? 'h5'
        : state.heading6 ? 'h6'
        : state.blockquote ? 'blockquote'
        : 'paragraph'

    function apply(next: string) {
        const chain = editor.chain().focus()
        if (next === 'paragraph') {
            chain.setParagraph().run()
        } else if (next === 'blockquote') {
            chain.toggleBlockquote().run()
        } else {
            const level = Number(next.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6
            chain.toggleHeading({ level }).run()
        }
    }

    return (
        <div className="relative">
            <select
                aria-label="Block type"
                value={value}
                onChange={(e) => apply(e.target.value)}
                className="appearance-none h-8 pl-2 pr-6 text-xs rounded border border-border bg-surface text-text hover:border-text focus:outline-none focus:border-accent cursor-pointer"
            >
                {BLOCK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
    )
}
