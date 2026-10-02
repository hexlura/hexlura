'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Entry {
    id: string
    email: string
    source: string
    unsubscribed_at: string | null
    added_at: string
}

interface ListData {
    id: string
    name: string
    created_at: string
}

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function sourceLabel(source: string) {
    if (source === 'manual') return 'Manual'
    if (source === 'csv') return 'CSV import'
    return source ? source.charAt(0).toUpperCase() + source.slice(1) : '—'
}

export default function EmailListDetailPage() {
    const params = useParams<{ id: string }>()
    const listId = params.id

    const [list, setList] = useState<ListData | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [notFound, setNotFound] = useState(false)

    const [emailsText, setEmailsText] = useState('')
    const [addLoading, setAddLoading] = useState(false)
    const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [csvLoading, setCsvLoading] = useState(false)
    const [csvMsg, setCsvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [removeError, setRemoveError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/organiser/email-lists/${listId}`)
            if (res.status === 404) { setNotFound(true); return }
            if (!res.ok) throw new Error(`list ${res.status}`)
            const json = await res.json()
            setList(json.list)
            setEntries(json.entries || [])
            setLoadError(null)
        } catch (e) {
            console.error('[EmailListDetail] load failed:', e)
            setLoadError('Could not load this list. Please refresh and try again.')
        } finally {
            setLoading(false)
        }
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
        const json = await res.json().catch(() => ({}))
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
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setCsvMsg({ type: 'error', text: json.error || 'Failed to import CSV.' })
        } else {
            const parts = [`${json.added} added`]
            if (json.duplicates) parts.push(`${json.duplicates} already in list`)
            if (json.skipped) parts.push(`${json.skipped} invalid`)
            if (json.truncated) parts.push('file was truncated to the max row limit')
            setCsvMsg({ type: 'success', text: 'CSV imported: ' + parts.join(', ') + '.' })
            fetchList()
        }
        setCsvLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleRemoveEntry(entryId: string) {
        setRemoveError(null)
        const res = await fetch(`/api/organiser/email-lists/${listId}/entries/${entryId}`, { method: 'DELETE' })
        if (!res.ok) {
            setRemoveError('Could not remove that contact. Please try again.')
            return
        }
        setEntries(prev => prev.filter(en => en.id !== entryId))
    }

    function focusAdd() {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        textareaRef.current?.focus()
    }

    if (notFound) {
        return (
            <div className="max-w-7xl">
                <div className="bg-card rounded-2xl shadow-card p-16 text-center">
                    <p className="text-muted text-sm mb-3">List not found.</p>
                    <Link href="/organiser/email-lists" className="text-accent text-sm font-semibold hover:underline">Back to Email Lists</Link>
                </div>
            </div>
        )
    }

    const subscribed = entries.filter(en => !en.unsubscribed_at).length

    return (
        <div className="max-w-7xl">
            <Link href="/organiser/email-lists" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Email Lists
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide uppercase">{loading && !list ? 'Loading…' : list?.name}</h1>
                    {list && (
                        <p className="text-muted text-sm mt-1">
                            {subscribed.toLocaleString()} subscriber{subscribed === 1 ? '' : 's'} · Created {fmtDate(list.created_at)}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvUpload}
                        disabled={csvLoading}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={csvLoading}
                        className="bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium shadow-soft disabled:opacity-60"
                    >
                        {csvLoading ? 'Importing…' : 'Import CSV'}
                    </button>
                    <button
                        type="button"
                        onClick={focusAdd}
                        className="bg-text text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
                    >
                        + Add Subscribers
                    </button>
                </div>
            </div>

            {csvMsg && (
                <p className={`text-sm mb-4 ${csvMsg.type === 'success' ? 'text-warm-green' : 'text-warm-red'}`}>{csvMsg.text}</p>
            )}
            {loadError && <p className="text-warm-red text-sm mb-4">{loadError}</p>}

            {/* Manual add */}
            <form onSubmit={handleAddEmails} className="bg-card rounded-2xl shadow-card p-6 mb-6">
                <p className="text-sm font-semibold mb-3">Add emails manually</p>
                <textarea
                    ref={textareaRef}
                    value={emailsText}
                    onChange={e => setEmailsText(e.target.value)}
                    rows={3}
                    required
                    placeholder="jane@email.com, john@email.com, ..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                />
                <button
                    type="submit"
                    disabled={addLoading}
                    className="mt-3 bg-accent text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
                >
                    {addLoading ? 'Adding…' : 'Add to List'}
                </button>
                {addMsg && (
                    <p className={`text-xs mt-3 ${addMsg.type === 'success' ? 'text-warm-green' : 'text-warm-red'}`}>{addMsg.text}</p>
                )}
            </form>

            {removeError && <p className="text-warm-red text-sm mb-4">{removeError}</p>}

            {/* Entries table */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {loading ? (
                    <p className="text-muted text-sm text-center py-12">Loading contacts…</p>
                ) : entries.length === 0 ? (
                    <p className="text-muted text-sm text-center py-12">No contacts yet. Add some above.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3.5 px-6">Email</th>
                                    <th className="font-medium py-3.5 px-4">Source</th>
                                    <th className="font-medium py-3.5 px-4">Status</th>
                                    <th className="font-medium py-3.5 px-6 text-right">Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id} className="group border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                        <td className="py-3.5 px-6 font-medium">{entry.email}</td>
                                        <td className="py-3.5 px-4 text-muted">{sourceLabel(entry.source)}</td>
                                        <td className="py-3.5 px-4">
                                            {entry.unsubscribed_at ? (
                                                <span className="text-xs font-semibold text-muted bg-border px-2.5 py-1 rounded-full">Unsubscribed</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full">Subscribed</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-6 text-right text-muted text-xs whitespace-nowrap">
                                            {/* Remove appears on row hover on desktop (always visible on touch screens) */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEntry(entry.id)}
                                                className="text-accent font-medium hover:underline mr-4 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            >
                                                Remove
                                            </button>
                                            {fmtDate(entry.added_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
