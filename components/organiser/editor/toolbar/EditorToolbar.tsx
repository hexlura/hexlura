'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Link as LinkIcon, Code2, Minus, Table as TableIcon, Command } from 'lucide-react'
import { HistoryButtons } from './HistoryButtons'
import { BlockTypeSelect } from './BlockTypeSelect'
import { FormattingButtons } from './FormattingButtons'
import { AlignmentButtons } from './AlignmentButtons'
import { ListButtons } from './ListButtons'
import { ToolbarButton, ToolbarSeparator } from './ToolbarButton'
import { useToolbarState } from './useToolbarState'
import { LinkDialog } from '../dialogs/LinkDialog'
import { ImageDialog } from '../dialogs/ImageDialog'
import { TableDialog } from '../dialogs/TableDialog'

interface EditorToolbarProps {
    editor: Editor
    onOpenCommandPalette: () => void
}

export function EditorToolbar({ editor, onOpenCommandPalette }: EditorToolbarProps) {
    const [linkOpen, setLinkOpen] = useState(false)
    const [imageOpen, setImageOpen] = useState(false)
    const [tableOpen, setTableOpen] = useState(false)
    const state = useToolbarState(editor)

    return (
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-surface">
            <FormattingButtons editor={editor} />
            <ToolbarButton
                icon={LinkIcon}
                label="Link"
                active={state.link}
                onClick={() => setLinkOpen(true)}
            />
            <ToolbarSeparator />
            <BlockTypeSelect editor={editor} />
            <ToolbarButton
                icon={Code2}
                label="Code block"
                active={state.codeBlock}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarSeparator />
            <ListButtons editor={editor} />
            <ToolbarSeparator />
            <AlignmentButtons editor={editor} />
            <ToolbarSeparator />
            <ToolbarButton icon={Minus} label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
            <ToolbarButton icon={TableIcon} label="Table" active={state.table} onClick={() => setTableOpen(true)} />
            {/* <ToolbarButton icon={ImageIcon} label="Image" onClick={() => setImageOpen(true)} /> */}
            <ToolbarSeparator />
            <HistoryButtons editor={editor} />
            <ToolbarSeparator />
            <ToolbarButton icon={Command} label="Command palette (Ctrl+K)" onClick={onOpenCommandPalette} />

            <LinkDialog editor={editor} isOpen={linkOpen} onClose={() => setLinkOpen(false)} />
            <ImageDialog editor={editor} isOpen={imageOpen} onClose={() => setImageOpen(false)} />
            <TableDialog editor={editor} isOpen={tableOpen} onClose={() => setTableOpen(false)} />
        </div>
    )
}
