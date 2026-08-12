'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Modal } from '@/components/ui/Modal'
import { isSafeUrl } from '../serialization/html'

interface ImageDialogProps {
    editor: Editor
    isOpen: boolean
    onClose: () => void
}

/**
 * Image insert is URL-only for now — no Supabase Storage upload wiring in this pass.
 */
export function ImageDialog({ editor, isOpen, onClose }: ImageDialogProps) {
    const [url, setUrl] = useState('')
    const [alt, setAlt] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setUrl('')
            setAlt('')
            setError(null)
        }
    }, [isOpen])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isSafeUrl(url)) {
            setError('Enter a valid image URL')
            return
        }
        editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() || undefined }).run()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Insert image">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-muted mb-1">Image URL</label>
                    <input
                        type="text"
                        autoFocus
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                    />
                    {error && <p className="text-xs text-accent mt-1">{error}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted mb-1">Alt text</label>
                    <input
                        type="text"
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                        placeholder="Describes the image for screen readers"
                        className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                    />
                </div>
                <button type="submit" className="bg-text text-white text-sm font-medium px-4 py-2 hover:bg-text/90 rounded">
                    Insert
                </button>
            </form>
        </Modal>
    )
}
