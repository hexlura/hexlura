'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Entry {
    id: string
    email: string
    source: 'manual' | 'csv'
    unsubscribed_at: string | null
    added_at: string
}

interface ListData {
    id: string
    name: string
    created_at: string
}

export default function EmailListDetailPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const listId = params.id

    const [list, setList] = useState<ListData | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const [emailsText, setEmailsText] = useState('')
    const [addLoading, setAddLoading] = useState(false)
    const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [csvLoading, setCsvLoading] = useState(false)
    const [csvMsg, setCsvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchList = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/organiser/email-lists/${listId}`)
        if (res.status === 404) { setNotFound(true); setLoading(false); return }
        const json = await res.json()
        setList(json.list)
        setEntries(json.entries || [])
        setLoading(false)
    }, [listId])

    useEffect(() => { fetchList() }, [fetchList])

    async function handleAddEmails(e: React.FormEvent) {
        e.preventDefault()
        setAddMsg(null)
        setAddLoading(true)
        const res = await fetch(`/api/organiser/email-lists/${listId}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: emailsText }),
        })
        const json = await res.json()
        if (!res.ok) {
            setAddMsg({ type: 'error', text: json.error || 'Failed to add emails.' })
        } else {
            const parts = [`${json.added} added`]
            if (json.duplicates) parts.push(`${json.duplicates} already in list`)
            if (json.skipped) parts.push(`${json.skipped} invalid`)
            setAddMsg({ type: 'success', text: parts.join(', ') + '.' })
            setEmailsText('')
            fetchList()
        }
        setAddLoading(false)
    }

    async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setCsvMsg(null)
        setCsvLoading(true)
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/organiser/email-lists/${listId}/entries/csv`, {
            method: 'POST',
            body: formData,
        })
        const json = await res.json()
        if (!res.ok) {
            setCsvMsg({ type: 'error', text: json.error || 'Failed to import CSV.' })
        } else {
            const parts = [`${json.added} added`]
            if (json.duplicates) parts.push(`${json.duplicates} already in list`)
            if (json.skipped) parts.push(`${json.skipped} invalid`)
            if (json.truncated) parts.push('file was truncated to the max row limit')
            setCsvMsg({ type: 'success', text: parts.join(', ') + '.' })
            fetchList()
        }
        setCsvLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleRemoveEntry(entryId: string) {
        await fetch(`/api/organiser/email-lists/${listId}/entries/${entryId}`, { method: 'DELETE' })
        setEntries(prev => prev.filter(en => en.id !== entryId))
    }

    if (notFound) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center">
                <p className="text-muted mb-4">List not found.</p>
                <Link href="/organiser/email-lists" className="text-accent hover:underline text-sm">Back to lists</Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
            <button onClick={() => router.push('/organiser/email-lists')} className="text-xs text-muted hover:text-text mb-3">
                ← Back to lists
            </button>
            <h1 className="font-heading text-3xl text-text tracking-wide mb-6">
                {loading ? 'Loading…' : list?.name}
            </h1>

            {/* Manual add */}
            <form onSubmit={handleAddEmails} className="bg-surface border border-border rounded-none p-6 mb-6 space-y-3">
                <label className="block text-sm font-semibold text-text">Add emails manually</label>
                <textarea
                    value={emailsText}
                    onChange={e => setEmailsText(e.target.value)}
                    placeholder="jane@example.com, mo@example.com, ..."
                    rows={3}
                    required
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent resize-y"
                />
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">Separate multiple emails with commas.</p>
                    <button
                        type="submit"
                        disabled={addLoading}
                        className="h-10 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-60 whitespace-nowrap"
                    >
                        {addLoading ? 'Adding…' : 'Add Emails'}
                    </button>
                </div>
                {addMsg && (
                    <p className={`text-xs ${addMsg.type === 'success' ? 'text-success' : 'text-accent'}`}>{addMsg.text}</p>
                )}
            </form>

            {/* CSV upload */}
            <div className="bg-surface border border-border rounded-none p-6 mb-8 space-y-3">
                <label className="block text-sm font-semibold text-text">Upload a CSV file</label>
                <p className="text-xs text-muted">A single column of email addresses, with or without an &quot;email&quot; header row.</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvUpload}
                    disabled={csvLoading}
                    className="text-sm text-text"
                />
                {csvLoading && <p className="text-xs text-muted">Importing…</p>}
                {csvMsg && (
                    <p className={`text-xs ${csvMsg.type === 'success' ? 'text-success' : 'text-accent'}`}>{csvMsg.text}</p>
                )}
            </div>

            {/* Entries table */}
            {loading ? (
                <p className="text-muted text-center py-8">Loading contacts…</p>
            ) : entries.length === 0 ? (
                <p className="text-muted text-center py-8">No contacts yet. Add some above.</p>
            ) : (
                <div className="bg-surface border border-border rounded-none overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-semibold">Email</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-semibold">Source</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-semibold">Status</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2 text-text">{entry.email}</td>
                                    <td className="px-4 py-2 text-muted capitalize">{entry.source}</td>
                                    <td className="px-4 py-2">
                                        {entry.unsubscribed_at ? (
                                            <span className="text-xs text-muted">Unsubscribed</span>
                                        ) : (
                                            <span className="text-xs text-success">Active</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => handleRemoveEntry(entry.id)} className="text-xs text-muted hover:text-accent">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
