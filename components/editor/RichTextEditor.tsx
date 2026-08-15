'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { LEGAL_CONTENT_CLASSES } from '@/lib/legal-content-styles'
import { createEditorExtensions } from './editor-extensions'
import { getHTML, setHTML } from './serialization/html'
import { getMarkdown, setMarkdown } from './serialization/markdown'
import type { EditorMode, RichTextEditorProps, RichTextEditorRef } from './editor-types'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin'
import { LinkBubblePlugin } from './plugins/LinkBubblePlugin'
import { CommandPalettePlugin } from './plugins/CommandPalettePlugin'
import { ContextMenuPlugin } from './plugins/ContextMenuPlugin'
import { LinkDialog } from './dialogs/LinkDialog'
import { TableDialog } from './dialogs/TableDialog'

// Drag-to-reorder is implemented in plugins/DragHandlePlugin but disabled for now —
// re-enable by rendering <DragHandlePlugin editor={editor} containerRef={containerRef} />
// inside the content wrapper below.

const MODE_TABS: { value: EditorMode; label: string }[] = [
    { value: 'visual', label: 'Visual' },
    { value: 'html', label: 'HTML' },
    // { value: 'markdown', label: 'Markdown' },
]

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
    function RichTextEditor({ content, onChange, placeholder, readOnly }, ref) {
        const containerRef = useRef<HTMLDivElement>(null)
        const [mode, setMode] = useState<EditorMode>('visual')
        const [rawValue, setRawValue] = useState('')
        const [paletteLinkOpen, setPaletteLinkOpen] = useState(false)
        const [paletteTableOpen, setPaletteTableOpen] = useState(false)
        const [contextLinkOpen, setContextLinkOpen] = useState(false)
        const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

        const editor = useEditor({
            immediatelyRender: false,
            editable: !readOnly,
            extensions: createEditorExtensions(placeholder),
            content,
            onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
            editorProps: {
                attributes: {
                    class: `min-h-[200px] px-4 py-3 text-sm text-text focus:outline-none max-w-none ${LEGAL_CONTENT_CLASSES}`,
                },
            },
        })

        useEffect(() => {
            if (editor && content !== editor.getHTML()) {
                editor.commands.setContent(content)
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [content, editor])

        useImperativeHandle(ref, () => ({
            focus: () => editor?.commands.focus(),
            clear: () => editor?.commands.clearContent(true),
            getHTML: () => (editor ? getHTML(editor) : ''),
            setHTML: (html: string) => editor && setHTML(editor, html),
            getMarkdown: () => (editor ? getMarkdown(editor) : ''),
            setMarkdown: (markdown: string) => editor && setMarkdown(editor, markdown),
            getJSON: () => (editor ? editor.getJSON() as Record<string, unknown> : {}),
            isEmpty: () => editor?.isEmpty ?? true,
        }), [editor])

        if (!editor) return null

        function switchMode(next: EditorMode) {
            if (!editor || next === mode) return
            if (mode !== 'visual' && next === 'visual') {
                if (mode === 'html') setHTML(editor, rawValue)
                else setMarkdown(editor, rawValue)
            } else if (mode !== 'visual' && next !== 'visual') {
                if (mode === 'html') setHTML(editor, rawValue)
                else setMarkdown(editor, rawValue)
                setRawValue(next === 'html' ? getHTML(editor) : getMarkdown(editor))
            } else {
                setRawValue(next === 'html' ? getHTML(editor) : getMarkdown(editor))
            }
            setMode(next)
        }

        return (
            <div className="border border-border rounded-xl overflow-hidden bg-surface">
                {!readOnly && (
                    <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Content</span>
                        <div className="flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5">
                            {MODE_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => switchMode(tab.value)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${mode === tab.value
                                        ? 'bg-background text-text shadow-sm'
                                        : 'text-muted hover:text-text'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {!readOnly && mode === 'visual' && (
                    <EditorToolbar editor={editor} onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
                )}
                {!readOnly && mode === 'visual' && <FloatingToolbarPlugin editor={editor} />}
                {!readOnly && mode === 'visual' && <LinkBubblePlugin editor={editor} />}
                {!readOnly && (
                    <CommandPalettePlugin
                        editor={editor}
                        open={commandPaletteOpen}
                        onOpenChange={setCommandPaletteOpen}
                        onOpenLinkDialog={() => setPaletteLinkOpen(true)}
                        onOpenTableDialog={() => setPaletteTableOpen(true)}
                    />
                )}
                {mode === 'visual' ? (
                    <div ref={containerRef} className="relative bg-background">
                        <EditorContent editor={editor} />
                        {!readOnly && (
                            <ContextMenuPlugin
                                editor={editor}
                                containerRef={containerRef}
                                onOpenLinkDialog={() => setContextLinkOpen(true)}
                            />
                        )}
                    </div>
                ) : (
                    <textarea
                        value={rawValue}
                        onChange={(e) => setRawValue(e.target.value)}
                        readOnly={readOnly}
                        spellCheck={false}
                        className="w-full min-h-[200px] px-4 py-3 text-sm text-text bg-background font-mono focus:outline-none resize-y"
                    />
                )}
                <LinkDialog editor={editor} isOpen={paletteLinkOpen} onClose={() => setPaletteLinkOpen(false)} />
                <TableDialog editor={editor} isOpen={paletteTableOpen} onClose={() => setPaletteTableOpen(false)} />
                <LinkDialog editor={editor} isOpen={contextLinkOpen} onClose={() => setContextLinkOpen(false)} />
            </div>
        )
    }
)
