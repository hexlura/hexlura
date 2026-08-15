'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { ExternalLink, Pencil, Unlink } from 'lucide-react'
import { useToolbarState } from '../toolbar/useToolbarState'
import { LinkDialog } from '../dialogs/LinkDialog'

export function LinkBubblePlugin({ editor }: { editor: Editor }) {
    const [editOpen, setEditOpen] = useState(false)
    const { linkHref } = useToolbarState(editor)

    return (
        <>
            <BubbleMenu
                editor={editor}
                pluginKey="linkBubble"
                shouldShow={({ editor: ed }) => ed.isActive('link')}
            >
                <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface shadow-lg text-xs">
                    <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded text-accent hover:bg-surface max-w-[220px] truncate"
                        title={linkHref}
                    >
                        <ExternalLink size={13} />
                        <span className="truncate">{linkHref}</span>
                    </a>
                    <button
                        type="button"
                        aria-label="Edit link"
                        title="Edit link"
                        onClick={() => setEditOpen(true)}
                        className="flex items-center justify-center h-7 w-7 rounded text-muted hover:text-text hover:bg-surface"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        type="button"
                        aria-label="Remove link"
                        title="Remove link"
                        onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
                        className="flex items-center justify-center h-7 w-7 rounded text-muted hover:text-text hover:bg-surface"
                    >
                        <Unlink size={13} />
                    </button>
                </div>
            </BubbleMenu>
            <LinkDialog editor={editor} isOpen={editOpen} onClose={() => setEditOpen(false)} />
        </>
    )
}
