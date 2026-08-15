'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
    Bold, Italic, Underline, Strikethrough, Code, Code2, Link as LinkIcon,
    Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus,
    AlignLeft, AlignCenter, AlignRight, Table as TableIcon, Search,
    type LucideIcon,
} from 'lucide-react'

interface Command {
    id: string
    label: string
    icon: LucideIcon
    keywords?: string
    run: (editor: Editor) => void
}

function buildCommands(openLink: () => void, openTable: () => void): Command[] {
    return [
        { id: 'h1', label: 'Heading 1', icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
        { id: 'h2', label: 'Heading 2', icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
        { id: 'h3', label: 'Heading 3', icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
        { id: 'bold', label: 'Bold', icon: Bold, run: (e) => e.chain().focus().toggleBold().run() },
        { id: 'italic', label: 'Italic', icon: Italic, run: (e) => e.chain().focus().toggleItalic().run() },
        { id: 'underline', label: 'Underline', icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run() },
        { id: 'strike', label: 'Strikethrough', icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run() },
        { id: 'code', label: 'Inline code', icon: Code, run: (e) => e.chain().focus().toggleCode().run() },
        { id: 'codeblock', label: 'Code block', icon: Code2, run: (e) => e.chain().focus().toggleCodeBlock().run() },
        { id: 'link', label: 'Link', icon: LinkIcon, keywords: 'url href', run: () => openLink() },
        { id: 'bullet', label: 'Bullet list', icon: List, run: (e) => e.chain().focus().toggleBulletList().run() },
        { id: 'ordered', label: 'Numbered list', icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run() },
        { id: 'quote', label: 'Quote', icon: Quote, keywords: 'blockquote', run: (e) => e.chain().focus().toggleBlockquote().run() },
        { id: 'hr', label: 'Horizontal rule', icon: Minus, keywords: 'divider', run: (e) => e.chain().focus().setHorizontalRule().run() },
        { id: 'table', label: 'Table', icon: TableIcon, keywords: 'grid rows columns', run: () => openTable() },
        { id: 'align-left', label: 'Align left', icon: AlignLeft, run: (e) => e.chain().focus().setTextAlign('left').run() },
        { id: 'align-center', label: 'Align center', icon: AlignCenter, run: (e) => e.chain().focus().setTextAlign('center').run() },
        { id: 'align-right', label: 'Align right', icon: AlignRight, run: (e) => e.chain().focus().setTextAlign('right').run() },
    ]
}

interface CommandPalettePluginProps {
    editor: Editor
    open: boolean
    onOpenChange: (open: boolean) => void
    onOpenLinkDialog: () => void
    onOpenTableDialog: () => void
}

export function CommandPalettePlugin({ editor, open, onOpenChange: setOpen, onOpenLinkDialog, onOpenTableDialog }: CommandPalettePluginProps) {
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const commands = useMemo(() => buildCommands(onOpenLinkDialog, onOpenTableDialog), [onOpenLinkDialog, onOpenTableDialog])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return commands
        return commands.filter((c) => `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(q))
    }, [commands, query])

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                const editorEl = editor.view.dom
                if (!editorEl.contains(document.activeElement) && document.activeElement !== document.body) return
                e.preventDefault()
                setOpen(true)
                setQuery('')
                setActiveIndex(0)
            } else if (e.key === 'Escape' && open) {
                setOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [editor, open, setOpen])

    useEffect(() => {
        if (open) requestAnimationFrame(() => inputRef.current?.focus())
    }, [open])

    useEffect(() => setActiveIndex(0), [query])

    if (!open) return null

    function runCommand(cmd: Command) {
        setOpen(false)
        cmd.run(editor)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const cmd = filtered[activeIndex]
            if (cmd) runCommand(cmd)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh] p-4" onClick={() => setOpen(false)}>
            <div
                role="dialog"
                aria-label="Command palette"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl overflow-hidden"
            >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                    <Search size={16} className="text-muted shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command…"
                        className="flex-1 bg-transparent text-sm text-text focus:outline-none"
                    />
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                    {filtered.length === 0 && (
                        <p className="px-3 py-4 text-xs text-muted text-center">No matching commands</p>
                    )}
                    {filtered.map((cmd, i) => {
                        const Icon = cmd.icon
                        return (
                            <button
                                key={cmd.id}
                                type="button"
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => runCommand(cmd)}
                                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left ${i === activeIndex ? 'bg-accent text-white' : 'text-text hover:bg-surface'}`}
                            >
                                <Icon size={15} />
                                {cmd.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
