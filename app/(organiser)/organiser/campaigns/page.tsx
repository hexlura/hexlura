'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface EventLite { id: string; title: string; slug: string }
interface EmailListLite { id: string; name: string; entry_count: number }

interface DraftCampaign {
    id: string
    subject: string
    body: string
    status: 'draft' | 'sending' | 'sent' | 'failed'
    recipient_count: number
}

interface CampaignHistoryItem {
    id: string
    subject: string
    status: 'draft' | 'sending' | 'sent' | 'failed'
    recipient_count: number
    sent_count: number
    created_at: string
    sent_at: string | null
    event: { title: string } | null
    list: { name: string } | null
}

export default function CampaignsPage() {
    const [events, setEvents] = useState<EventLite[]>([])
    const [lists, setLists] = useState<EmailListLite[]>([])
    const [history, setHistory] = useState<CampaignHistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    const [eventId, setEventId] = useState('')
    const [listId, setListId] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')

    const [draft, setDraft] = useState<DraftCampaign | null>(null)
    const [consentConfirmed, setConsentConfirmed] = useState(false)
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState('')
    const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)

    const loadAll = useCallback(async () => {
        setLoading(true)
        const [eventsRes, listsRes, campaignsRes] = await Promise.all([
            fetch('/api/organiser/events-lite'),
            fetch('/api/organiser/email-lists'),
            fetch('/api/organiser/campaigns'),
        ])
        const [eventsJson, listsJson, campaignsJson] = await Promise.all([
            eventsRes.json(), listsRes.json(), campaignsRes.json(),
        ])
        setEvents(eventsJson.events || [])
        setLists(listsJson.lists || [])
        setHistory(campaignsJson.campaigns || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    async function handleCreateDraft(e: React.FormEvent) {
        e.preventDefault()
        setCreateError('')
        setCreating(true)
        const res = await fetch('/api/organiser/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, listId, subject, message }),
        })
        const json = await res.json()
        if (!res.ok) {
            setCreateError(json.error || 'Failed to create campaign.')
        } else {
            setDraft(json.campaign)
            setConsentConfirmed(false)
            setSendResult(null)
            setSendError('')
        }
        setCreating(false)
    }

    async function handleDiscardDraft() {
        if (!draft) return
        await fetch(`/api/organiser/campaigns/${draft.id}`, { method: 'DELETE' })
        setDraft(null)
        setEventId(''); setListId(''); setSubject(''); setMessage('')
    }

    async function handleConfirmSend() {
        if (!draft || !consentConfirmed) return
        setSending(true)
        setSendError('')
        const res = await fetch(`/api/organiser/campaigns/${draft.id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consentConfirmed: true }),
        })
        const json = await res.json()
        if (!res.ok) {
            setSendError(json.error || 'Failed to send campaign.')
        } else {
            setSendResult({ sent: json.sent_count, failed: json.failed_count })
            setDraft(null)
            setEventId(''); setListId(''); setSubject(''); setMessage('')
            loadAll()
        }
        setSending(false)
    }

    const selectedList = lists.find(l => l.id === listId)

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
            <h1 className="font-heading text-3xl text-text tracking-wide mb-1">PROMOTE VIA EMAIL</h1>
            <p className="text-sm text-muted mb-6">Send an event announcement to one of your contact lists.</p>

            {sendResult && (
                <div className="bg-success/10 border border-success/20 rounded-none p-4 mb-6 text-sm text-success">
                    Campaign sent — {sendResult.sent} delivered{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}.
                </div>
            )}

            {!draft ? (
                <form onSubmit={handleCreateDraft} className="bg-surface border border-border rounded-none p-6 mb-8 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text mb-1">Event</label>
                        <select
                            value={eventId}
                            onChange={e => setEventId(e.target.value)}
                            required
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        >
                            <option value="">Select an event…</option>
                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text mb-1">Contact list</label>
                        <select
                            value={listId}
                            onChange={e => setListId(e.target.value)}
                            required
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        >
                            <option value="">Select a list…</option>
                            {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.entry_count})</option>)}
                        </select>
                        {lists.length === 0 && (
                            <p className="text-xs text-muted mt-1">
                                No lists yet. <Link href="/organiser/email-lists" className="text-accent hover:underline">Create one first</Link>.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text mb-1">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            maxLength={200}
                            required
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text mb-1">Message</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={6}
                            maxLength={5000}
                            required
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent resize-y"
                        />
                    </div>

                    {createError && <p className="text-accent text-xs">{createError}</p>}

                    <button
                        type="submit"
                        disabled={creating || loading}
                        className="w-full h-11 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-60"
                    >
                        {creating ? 'Preparing…' : 'Preview Campaign'}
                    </button>
                </form>
            ) : (
                <div className="bg-surface border border-border rounded-none p-6 mb-8 space-y-4">
                    <p className="text-xs uppercase tracking-wider text-muted font-semibold">Preview</p>
                    <div className="border-t border-b border-border py-3">
                        <p className="font-semibold text-text">{draft.subject}</p>
                        <p className="text-sm text-muted mt-2 whitespace-pre-wrap">{draft.body}</p>
                    </div>
                    <p className="text-sm text-text">
                        This will send to <strong>{draft.recipient_count}</strong> contact{draft.recipient_count === 1 ? '' : 's'}
                        {selectedList ? ` in "${selectedList.name}"` : ''}.
                    </p>

                    <label className="flex items-start gap-2 text-sm text-text">
                        <input
                            type="checkbox"
                            checked={consentConfirmed}
                            onChange={e => setConsentConfirmed(e.target.checked)}
                            className="mt-1"
                        />
                        <span>I confirm I have permission to email these contacts.</span>
                    </label>

                    {sendError && <p className="text-accent text-xs">{sendError}</p>}

                    <div className="flex gap-3">
                        <button
                            onClick={handleConfirmSend}
                            disabled={!consentConfirmed || sending}
                            className="flex-1 h-11 rounded-sm bg-accent text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
                        >
                            {sending ? 'Sending…' : 'Confirm & Send'}
                        </button>
                        <button
                            onClick={handleDiscardDraft}
                            disabled={sending}
                            className="h-11 px-6 rounded-sm border border-border text-text text-sm hover:bg-card transition disabled:opacity-50"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">History</h2>
            {loading ? (
                <p className="text-muted text-center py-8">Loading…</p>
            ) : history.length === 0 ? (
                <p className="text-muted text-center py-8">No campaigns sent yet.</p>
            ) : (
                <div className="space-y-2">
                    {history.filter(h => h.status !== 'draft').map(item => (
                        <div key={item.id} className="bg-surface border border-border rounded-none p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-text truncate">{item.subject}</p>
                                <span className={`text-xs shrink-0 ${item.status === 'sent' ? 'text-success' : item.status === 'failed' ? 'text-accent' : 'text-muted'}`}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs text-muted mt-1">
                                {item.event?.title} · {item.list?.name} · {item.sent_count}/{item.recipient_count} delivered
                                {item.sent_at ? ` · ${new Date(item.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
