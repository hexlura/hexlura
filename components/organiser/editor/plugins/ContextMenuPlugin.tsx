'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Link as LinkIcon, Copy, Scissors, Clipboard, Trash2 } from 'lucide-react'

interface ContextMenuPluginProps {
    editor: Editor
    containerRef: React.RefObject<HTMLDivElement>
    onOpenLinkDialog: () => void
}

interface MenuState {
    x: number
    y: number
}

const ITEM_CLASS = 'flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left text-text hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed'

export function ContextMenuPlugin({ editor, containerRef, onOpenLinkDialog }: ContextMenuPluginProps) {
    const [menu, setMenu] = useState<MenuState | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        function handleContextMenu(e: MouseEvent) {
            e.preventDefault()
            const containerRect = container!.getBoundingClientRect()
            setMenu({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top })
        }
        function handleClickAway() { setMenu(null) }
        function handleEscape(e: KeyboardEvent) { if (e.key === 'Escape') setMenu(null) }

        container.addEventListener('contextmenu', handleContextMenu)
        document.addEventListener('mousedown', handleClickAway)
        document.addEventListener('keydown', handleEscape)
        return () => {
            container.removeEventListener('contextmenu', handleContextMenu)
            document.removeEventListener('mousedown', handleClickAway)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [containerRef])

    if (!menu) return null

    const { empty } = editor.state.selection

    async function copySelection() {
        const { from, to } = editor.state.selection
        const text = editor.state.doc.textBetween(from, to, '\n')
        try { await navigator.clipboard.writeText(text) } catch { /* clipboard unavailable */ }
        setMenu(null)
    }

    async function cutSelection() {
        await copySelection()
        editor.chain().focus().deleteSelection().run()
        setMenu(null)
    }

    async function pasteClipboard() {
        try {
            const text = await navigator.clipboard.readText()
            editor.chain().focus().insertContent(text).run()
        } catch { /* clipboard unavailable or permission denied */ }
        setMenu(null)
    }

    function run(fn: () => void) {
        fn()
        setMenu(null)
    }

    return (
        <div
            role="menu"
            style={{ top: menu.y, left: menu.x }}
            className="absolute z-40 w-48 rounded-lg border border-border bg-surface shadow-lg py-1"
        >
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={cutSelection}>
                <Scissors size={14} /> Cut
            </button>
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={copySelection}>
                <Copy size={14} /> Copy
            </button>
            <button type="button" className={ITEM_CLASS} onClick={pasteClipboard}>
                <Clipboard size={14} /> Paste
            </button>
            <div className="h-px bg-border my-1" />
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={() => run(() => editor.chain().focus().toggleBold().run())}>
                <Bold size={14} /> Bold
            </button>
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>
                <Italic size={14} /> Italic
            </button>
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>
                <Underline size={14} /> Underline
            </button>
            <button type="button" className={ITEM_CLASS} disabled={empty} onClick={() => run(onOpenLinkDialog)}>
                <LinkIcon size={14} /> Link
            </button>
            <div className="h-px bg-border my-1" />
            <button
                type="button"
                className={ITEM_CLASS}
                onClick={() => run(() => editor.chain().focus().deleteNode(editor.state.selection.$from.parent.type.name).run())}
            >
                <Trash2 size={14} /> Delete block
            </button>
        </div>
    )
}
