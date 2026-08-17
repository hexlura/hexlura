'use client'

import type { Editor } from '@tiptap/react'
import { List, ListOrdered, IndentIncrease, IndentDecrease } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import { useToolbarState } from './useToolbarState'

export function ListButtons({ editor }: { editor: Editor }) {
    const state = useToolbarState(editor)

    return (
        <>
            <ToolbarButton
                icon={List}
                label="Bullet list"
                active={state.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
                icon={ListOrdered}
                label="Numbered list"
                active={state.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
                icon={IndentIncrease}
                label="Indent"
                disabled={!state.canSinkListItem}
                onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            />
            <ToolbarButton
                icon={IndentDecrease}
                label="Outdent"
                disabled={!state.canLiftListItem}
                onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            />
        </>
    )
}
