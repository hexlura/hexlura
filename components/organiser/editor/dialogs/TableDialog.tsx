'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Modal } from '@/components/ui/Modal'

interface TableDialogProps {
    editor: Editor
    isOpen: boolean
    onClose: () => void
}

const MAX_DIM = 10

export function TableDialog({ editor, isOpen, onClose }: TableDialogProps) {
    const [rows, setRows] = useState(3)
    const [cols, setCols] = useState(3)
    const [withHeaderRow, setWithHeaderRow] = useState(true)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Insert table">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted mb-1">Rows</label>
                        <input
                            type="number"
                            min={1}
                            max={MAX_DIM}
                            value={rows}
                            onChange={(e) => setRows(Math.min(MAX_DIM, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-20 px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted mb-1">Columns</label>
                        <input
                            type="number"
                            min={1}
                            max={MAX_DIM}
                            value={cols}
                            onChange={(e) => setCols(Math.min(MAX_DIM, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-20 px-3 py-2 text-sm rounded border border-border bg-surface text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={withHeaderRow} onChange={(e) => setWithHeaderRow(e.target.checked)} />
                    Include header row
                </label>
                <div
                    className="grid gap-1 w-fit"
                    style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}
                    aria-hidden="true"
                >
                    {Array.from({ length: rows * cols }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-4 w-4 rounded-sm border ${withHeaderRow && i < cols ? 'bg-accent/30 border-accent/50' : 'bg-surface border-border'}`}
                        />
                    ))}
                </div>
                <button type="submit" className="bg-text text-white text-sm font-medium px-4 py-2 hover:bg-text/90 rounded">
                    Insert table
                </button>
            </form>
        </Modal>
    )
}
