'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

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

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export default function CampaignsPage() {
    const [events, setEvents] = useState<EventLite[]>([])
    const [lists, setLists] = useState<EmailListLite[]>([])
    const [history, setHistory] = useState<CampaignHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [showModal, setShowModal] = useState(false)
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
        try {
            const [eventsRes, listsRes, campaignsRes] = await Promise.all([
                fetch('/api/organiser/events-lite'),
                fetch('/api/organiser/email-lists'),
                fetch('/api/organiser/campaigns'),
            ])
            if (!eventsRes.ok || !listsRes.ok || !campaignsRes.ok) throw new Error('campaigns data failed to load')
            const [eventsJson, listsJson, campaignsJson] = await Promise.all([
                eventsRes.json(), listsRes.json(), campaignsRes.json(),
            ])
            setEvents(eventsJson.events || [])
            setLists(listsJson.lists || [])
            setHistory(campaignsJson.campaigns || [])
            setLoadError(null)
        } catch (e) {
            console.error('[Campaigns] load failed:', e)
            setLoadError('Could not load your campaigns. Please refresh and try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    function resetForm() {
        setEventId(''); setListId(''); setSubject(''); setMessage('')
    }

    function openModal() {
        resetForm()
        setCreateError('')
        setSendError('')
        setDraft(null)
        setConsentConfirmed(false)
        setSendResult(null)
        setShowModal(true)
    }

    async function handleCreateDraft(e: React.FormEvent) {
        e.preventDefault()
        setCreateError('')
        setCreating(true)
        const res = await fetch('/api/organiser/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, listId, subject, message }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setCreateError(json.error || 'Failed to create campaign.')
        } else {
            setDraft(json.campaign)
            setConsentConfirmed(false)
            setSendError('')
        }
        setCreating(false)
    }

    // Deletes the unsent draft on the server. `keepFields` returns to the compose step with the text intact.
    async function discardDraft(keepFields: boolean) {
        if (!draft) return
        const res = await fetch(`/api/organiser/campaigns/${draft.id}`, { method: 'DELETE' })
        if (!res.ok) {
            setSendError('Could not discard the draft. Please try again.')
            return
        }
        setDraft(null)
        setConsentConfirmed(false)
        setSendError('')
        if (!keepFields) resetForm()
    }

    // Closing the modal (X, backdrop, Cancel, Escape) never leaves an unsent draft behind
    async function closeModal() {
        if (sending) return
        if (draft) await discardDraft(false)
        setShowModal(false)
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
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setSendError(json.error || 'Failed to send campaign.')
        } else {
            setSendResult({ sent: json.sent_count, failed: json.failed_count })
            setDraft(null)
            resetForm()
            setShowModal(false)
            loadAll()
        }
        setSending(false)
    }

    // Escape closes the modal
    useEffect(() => {
        if (!showModal) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal, draft, sending])

    const selectedList = lists.find(l => l.id === listId)
    const sentHistory = history.filter(h => h.status !== 'draft')
    const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const selectClass = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">PROMOTE VIA EMAIL</h1>
                    <p className="text-muted text-sm mt-1">Send campaigns to your subscriber lists</p>
                </div>
                <button
                    type="button"
                    onClick={openModal}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    New Campaign
                </button>
            </div>

            {sendResult && (
                <div className="bg-warm-green/10 rounded-2xl p-4 mb-6 text-sm font-medium text-warm-green">
                    Campaign sent — {sendResult.sent} delivered{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}.
                </div>
            )}

            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">History</h2>
            {loading ? (
                <p className="text-muted text-sm text-center py-12">Loading…</p>
            ) : loadError ? (
                <p className="text-warm-red text-sm text-center py-12">{loadError}</p>
            ) : sentHistory.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                    <p className="text-muted text-sm">No campaigns sent yet.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {sentHistory.map(item => (
                        <div key={item.id} className="bg-card rounded-2xl shadow-card p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-medium truncate">{item.subject}</p>
                                <span className={`text-xs font-semibold shrink-0 ${item.status === 'sent' ? 'text-warm-green' : item.status === 'failed' ? 'text-warm-red' : 'text-muted'}`}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs text-muted mt-1">
                                {item.event?.title} · {item.list?.name} · {item.sent_count.toLocaleString()}/{item.recipient_count.toLocaleString()} delivered
                                {item.sent_at ? ` · ${fmtDate(item.sent_at)}` : ''}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* New Campaign modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={closeModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">PROMOTE VIA EMAIL</h2>
                                <p className="text-muted text-xs mt-0.5">Send an event announcement to one of your contact lists</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                aria-label="Close"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-text transition-colors shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {!draft ? (
                            /* Step 1: compose */
                            <form onSubmit={handleCreateDraft}>
                                <div className="p-6 flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Event</label>
                                        <ThemedSelect
                                            value={eventId}
                                            onChange={e => setEventId(e.target.value)}
                                            required
                                            className={selectClass}
                                        >
                                            <option value="">Select an event…</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                        </ThemedSelect>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Contact list</label>
                                        <ThemedSelect
                                            value={listId}
                                            onChange={e => setListId(e.target.value)}
                                            required
                                            className={selectClass}
                                        >
                                            <option value="">Select a list…</option>
                                            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </ThemedSelect>
                                        {lists.length === 0 && (
                                            <p className="text-xs text-muted mt-1.5">
                                                No lists yet. <Link href="/organiser/email-lists" className="text-accent font-medium hover:underline">Create one first</Link>.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            maxLength={200}
                                            required
                                            placeholder="e.g. Last chance — tickets almost gone!"
                                            className={modalInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            rows={5}
                                            maxLength={5000}
                                            required
                                            placeholder="Write your campaign email..."
                                            className={modalInput}
                                        />
                                    </div>
                                    {createError && <p className="text-warm-red text-xs">{createError}</p>}
                                </div>
                                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || loading}
                                        className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                                    >
                                        {creating ? 'Preparing…' : 'Create Draft'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* Step 2: preview + consent */
                            <div>
                                <div className="p-6 flex flex-col gap-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Preview</p>
                                    <div className="border-t border-b border-border py-3">
                                        <p className="font-semibold text-sm">{draft.subject}</p>
                                        <p className="text-sm text-muted mt-2 whitespace-pre-wrap">{draft.body}</p>
                                    </div>
                                    <p className="text-sm">
                                        This will send to <strong>{draft.recipient_count.toLocaleString()}</strong> contact{draft.recipient_count === 1 ? '' : 's'}
                                        {selectedList ? ` in "${selectedList.name}"` : ''}.
                                    </p>
                                    <label className="flex items-start gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={consentConfirmed}
                                            onChange={e => setConsentConfirmed(e.target.checked)}
                                            className="mt-1 accent-[#E63950]"
                                        />
                                        <span>I confirm I have permission to email these contacts.</span>
                                    </label>
                                    {sendError && <p className="text-warm-red text-xs">{sendError}</p>}
                                </div>
                                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => discardDraft(true)}
                                        disabled={sending}
                                        className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmSend}
                                        disabled={!consentConfirmed || sending}
                                        className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {sending ? 'Sending…' : 'Confirm & Send'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
