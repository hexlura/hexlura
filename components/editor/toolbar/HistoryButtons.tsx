'use client'

import type { Editor } from '@tiptap/react'
import { Undo, Redo } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import { useToolbarState } from './useToolbarState'

export function HistoryButtons({ editor }: { editor: Editor }) {
    const state = useToolbarState(editor)

    return (
        <>
            <ToolbarButton
                icon={Undo}
                label="Undo"
                disabled={!state.canUndo}
                onClick={() => editor.chain().focus().undo().run()}
            />
            <ToolbarButton
                icon={Redo}
                label="Redo"
                disabled={!state.canRedo}
                onClick={() => editor.chain().focus().redo().run()}
            />
        </>
    )
}
