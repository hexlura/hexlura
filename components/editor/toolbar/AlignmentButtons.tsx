'use client'

import type { Editor } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import { useToolbarState } from './useToolbarState'

const ALIGNMENTS = [
    { value: 'left', stateKey: 'alignLeft', icon: AlignLeft, label: 'Align left' },
    { value: 'center', stateKey: 'alignCenter', icon: AlignCenter, label: 'Align center' },
    { value: 'right', stateKey: 'alignRight', icon: AlignRight, label: 'Align right' },
    { value: 'justify', stateKey: 'alignJustify', icon: AlignJustify, label: 'Justify' },
] as const

export function AlignmentButtons({ editor }: { editor: Editor }) {
    const state = useToolbarState(editor)

    return (
        <>
            {ALIGNMENTS.map(({ value, stateKey, icon, label }) => (
                <ToolbarButton
                    key={value}
                    icon={icon}
                    label={label}
                    active={state[stateKey]}
                    onClick={() => editor.chain().focus().setTextAlign(value).run()}
                />
            ))}
        </>
    )
}
