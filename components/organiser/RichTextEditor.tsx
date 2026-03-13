'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'

interface RichTextEditorProps {
    content: string
    onChange: (html: string) => void
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: 'min-h-[200px] px-4 py-3 text-sm text-text focus:outline-none prose prose-invert max-w-none',
            },
        },
    })

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content])

    if (!editor) return null

    const btn = (active: boolean) =>
        `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-surface'}`

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-surface">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>B</button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>I</button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}>U</button>
                <div className="w-px bg-border mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>H2</button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>H3</button>
                <div className="w-px bg-border mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>• List</button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>1. List</button>
                <div className="w-px bg-border mx-1" />
                <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>—</button>
                <button
                    type="button"
                    onClick={() => {
                        const url = window.prompt('Enter URL')
                        if (url) editor.chain().focus().setLink({ href: url }).run()
                    }}
                    className={btn(editor.isActive('link'))}
                >
                    Link
                </button>
            </div>
            <div className="bg-surface">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
