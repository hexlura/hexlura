'use client'

import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import { useToolbarState } from './useToolbarState'

export function FormattingButtons({ editor }: { editor: Editor }) {
    const state = useToolbarState(editor)

    return (
        <>
            <ToolbarButton
                icon={Bold}
                label="Bold"
                active={state.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
                icon={Italic}
                label="Italic"
                active={state.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
                icon={Underline}
                label="Underline"
                active={state.underline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
                icon={Strikethrough}
                label="Strikethrough"
                active={state.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
                icon={Code}
                label="Inline code"
                active={state.code}
                onClick={() => editor.chain().focus().toggleCode().run()}
            />
        </>
    )
}
