'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface EmailList {
    id: string
    name: string
    created_at: string
    entry_count: number
}

// Icon-chip colours cycle across the cards, as in the design
const CHIPS = [
    'bg-warm-red/10 text-warm-red',
    'bg-warm-orange/10 text-warm-orangeText',
    'bg-warm-yellow/10 text-warm-yellowText',
]

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export default function EmailListsPage() {
    const [lists, setLists] = useState<EmailList[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [showNew, setShowNew] = useState(false)
    const [name, setName] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const fetchLists = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/organiser/email-lists')
            if (!res.ok) throw new Error(`lists ${res.status}`)
            const json = await res.json()
            setLists(json.lists || [])
            setLoadError(null)
        } catch (e) {
            console.error('[EmailLists] load failed:', e)
            setLoadError('Could not load your lists. Please refresh and try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchLists() }, [fetchLists])

    // Escape closes the modal
    useEffect(() => {
        if (!showNew) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowNew(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [showNew])

    function openNew() {
        setName('')
        setError('')
        setShowNew(true)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setCreating(true)
        const res = await fetch('/api/organiser/email-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setError(json.error || 'Failed to create list.')
        } else {
            setName('')
            setShowNew(false)
            fetchLists()
        }
        setCreating(false)
    }

    async function handleDelete(id: string, listName: string) {
        if (!confirm(`Delete "${listName}"? This removes all contacts in it.`)) return
        setDeleteError(null)
        const res = await fetch(`/api/organiser/email-lists/${id}`, { method: 'DELETE' })
        if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            setDeleteError(json.error || 'Failed to delete list.')
            return
        }
        fetchLists()
    }

    const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">EMAIL LISTS</h1>
                    <p className="text-muted text-sm mt-1">Build subscriber lists to promote your events</p>
                </div>
                <button
                    type="button"
                    onClick={openNew}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    New List
                </button>
            </div>

            {deleteError && <p className="text-warm-red text-sm mb-4">{deleteError}</p>}

            {loading ? (
                <p className="text-muted text-sm text-center py-16">Loading lists…</p>
            ) : loadError ? (
                <p className="text-warm-red text-sm text-center py-16">{loadError}</p>
            ) : lists.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-16 text-center">
                    <p className="text-muted text-sm">No lists yet. Create your first one with New List.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {lists.map((list, i) => (
                        <div key={list.id} className="relative group bg-card rounded-2xl shadow-card hover:shadow-hover transition-shadow">
                            <Link href={`/organiser/email-lists/${list.id}`} className="block p-6">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${CHIPS[i % CHIPS.length]}`}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                                </div>
                                <p className="font-medium truncate pr-8">{list.name}</p>
                                <p className="text-xs text-muted mt-1">{list.entry_count.toLocaleString()} subscriber{list.entry_count === 1 ? '' : 's'}</p>
                                <p className="text-xs text-muted mt-3">Created {fmtDate(list.created_at)}</p>
                            </Link>
                            <button
                                type="button"
                                onClick={() => handleDelete(list.id, list.name)}
                                title="Delete list"
                                aria-label={`Delete ${list.name}`}
                                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-warm-red transition-colors"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* New List modal */}
            {showNew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setShowNew(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <form onSubmit={handleCreate} className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">NEW LIST</h2>
                                <p className="text-muted text-xs mt-0.5">Create a subscriber list to promote future events</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNew(false)}
                                aria-label="Close"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-text transition-colors shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-muted block mb-1.5">List name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. VIP Subscribers"
                                    maxLength={100}
                                    required
                                    autoFocus
                                    className={modalInput}
                                />
                            </div>
                            {error && <p className="text-warm-red text-xs">{error}</p>}
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setShowNew(false)}
                                className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                            >
                                {creating ? 'Creating…' : 'Create List'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
