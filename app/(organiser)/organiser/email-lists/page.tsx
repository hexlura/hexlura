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

export default function EmailListsPage() {
    const [lists, setLists] = useState<EmailList[]>([])
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    const fetchLists = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/organiser/email-lists')
        const json = await res.json()
        setLists(json.lists || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchLists() }, [fetchLists])

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setCreating(true)
        const res = await fetch('/api/organiser/email-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error || 'Failed to create list.')
        } else {
            setName('')
            fetchLists()
        }
        setCreating(false)
    }

    async function handleDelete(id: string, listName: string) {
        if (!confirm(`Delete "${listName}"? This removes all contacts in it.`)) return
        await fetch(`/api/organiser/email-lists/${id}`, { method: 'DELETE' })
        fetchLists()
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
            <h1 className="font-heading text-3xl text-text tracking-wide mb-6">EMAIL LISTS</h1>

            <form onSubmit={handleCreate} className="bg-surface border border-border rounded-none p-6 mb-8 space-y-3">
                <label className="block text-sm font-semibold text-text">Create a new list</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Regulars, VIP Guests"
                        maxLength={100}
                        required
                        className="flex-1 border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                    />
                    <button
                        type="submit"
                        disabled={creating}
                        className="h-10 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-60"
                    >
                        {creating ? 'Creating…' : 'Create List'}
                    </button>
                </div>
                {error && <p className="text-accent text-xs">{error}</p>}
            </form>

            {loading ? (
                <p className="text-muted text-center py-8">Loading lists…</p>
            ) : lists.length === 0 ? (
                <p className="text-muted text-center py-8">No lists yet. Create your first one above.</p>
            ) : (
                <div className="space-y-3">
                    {lists.map(list => (
                        <div key={list.id} className="bg-surface border border-border rounded-none p-4 flex items-center justify-between gap-4">
                            <Link href={`/organiser/email-lists/${list.id}`} className="flex-1 min-w-0">
                                <p className="font-semibold text-text truncate">{list.name}</p>
                                <p className="text-xs text-muted mt-0.5">
                                    {list.entry_count} contact{list.entry_count === 1 ? '' : 's'} · Created{' '}
                                    {new Date(list.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </Link>
                            <div className="flex items-center gap-3 shrink-0">
                                <Link href={`/organiser/email-lists/${list.id}`} className="text-xs text-accent hover:underline font-medium">
                                    Manage
                                </Link>
                                <button
                                    onClick={() => handleDelete(list.id, list.name)}
                                    className="text-xs text-muted hover:text-accent"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
