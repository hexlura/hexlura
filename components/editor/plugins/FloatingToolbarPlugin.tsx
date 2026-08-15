'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Link as LinkIcon,
    Pilcrow,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Terminal,
    List,
    ListOrdered,
} from 'lucide-react'
import { ToolbarButton, ToolbarSeparator } from '../toolbar/ToolbarButton'
import { useToolbarState } from '../toolbar/useToolbarState'
import { LinkDialog } from '../dialogs/LinkDialog'

export function FloatingToolbarPlugin({ editor }: { editor: Editor }) {
    const [linkOpen, setLinkOpen] = useState(false)
    const state = useToolbarState(editor)

    return (
        <>
            <BubbleMenu
                editor={editor}
                pluginKey="floatingToolbar"
                options={{ placement: 'bottom', offset: 8, flip: true }}
                shouldShow={({ state, from, to }) => {
                    const { empty } = state.selection
                    if (empty || from === to) return false
                    // The link bubble owns selections inside an existing link.
                    if (editor.isActive('link')) return false
                    return true
                }}
            >
                <div className="flex flex-col gap-0.5 p-1 rounded-lg border border-border bg-surface shadow-lg">
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton icon={Bold} label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
                        <ToolbarButton icon={Italic} label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
                        <ToolbarButton icon={Underline} label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                        <ToolbarButton icon={Strikethrough} label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
                        <ToolbarButton icon={Code} label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()} />
                        <ToolbarSeparator />
                        <ToolbarButton icon={LinkIcon} label="Link" active={state.link} onClick={() => setLinkOpen(true)} />
                        <ToolbarSeparator />
                        <ToolbarButton icon={Pilcrow} label="Paragraph" active={state.paragraph} onClick={() => editor.chain().focus().setParagraph().run()} />
                        <ToolbarButton icon={Heading1} label="Heading 1" active={state.heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
                        <ToolbarButton icon={Heading2} label="Heading 2" active={state.heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
                    </div>
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton icon={Heading3} label="Heading 3" active={state.heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
                        <ToolbarButton icon={Quote} label="Quote" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                        <ToolbarButton icon={Terminal} label="Code block" active={state.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
                        <ToolbarSeparator />
                        <ToolbarButton icon={List} label="Bullet list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                        <ToolbarButton icon={ListOrdered} label="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                    </div>
                </div>
            </BubbleMenu>
            <LinkDialog editor={editor} isOpen={linkOpen} onClose={() => setLinkOpen(false)} />
        </>
    )
}
