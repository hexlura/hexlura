'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Modal } from '@/components/ui/Modal'
import { isSafeUrl } from '../serialization/html'

interface LinkDialogProps {
    editor: Editor
    isOpen: boolean
    onClose: () => void
}

export function LinkDialog({ editor, isOpen, onClose }: LinkDialogProps) {
    const [url, setUrl] = useState('')
    const [text, setText] = useState('')
    const [openInNewTab, setOpenInNewTab] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const hasExistingLink = editor.isActive('link')

    useEffect(() => {
        if (!isOpen) return
        const attrs = editor.getAttributes('link')
        const { from, to, empty } = editor.state.selection
        setUrl(attrs.href ?? '')
        setText(empty ? '' : editor.state.doc.textBetween(from, to, ' '))
        setOpenInNewTab(attrs.target === '_blank')
        setError(null)
    }, [isOpen, editor])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isSafeUrl(url)) {
            setError('Enter a valid http(s), mailto, or tel URL')
            return
        }
        const attrs = { href: url.trim(), target: openInNewTab ? '_blank' : null, rel: openInNewTab ? 'noopener noreferrer' : null }
        const chain = editor.chain().focus()
        if (editor.state.selection.empty) {
            chain.insertContent({ type: 'text', text: text || url, marks: [{ type: 'link', attrs }] }).run()
        } else {
            chain.extendMarkRange('link').setLink(attrs).run()
        }
        onClose()
    }

    function handleRemove() {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={hasExistingLink ? 'Edit link' : 'Insert link'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-muted mb-1">URL</label>
                    <input
                        type="text"
                        autoFocus
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                    />
                    {error && <p className="text-xs text-accent mt-1">{error}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted mb-1">Display text</label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Link text"
                        className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={openInNewTab} onChange={(e) => setOpenInNewTab(e.target.checked)} />
                    Open in new tab
                </label>
                <div className="flex items-center gap-2 pt-2">
                    <button type="submit" className="bg-text text-white text-sm font-medium px-4 py-2 hover:bg-text/90 rounded">
                        {hasExistingLink ? 'Update' : 'Insert'}
                    </button>
                    {hasExistingLink && (
                        <button type="button" onClick={handleRemove} className="text-sm text-accent px-4 py-2 hover:underline">
                            Remove link
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    )
}
