'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedSelect } from '@/components/ui/ThemedSelect'
import { SUPPORT_CATEGORIES, type SupportCategory, type SupportStatus } from '@/lib/support'

// Organiser-portal versions of the support UI. The user-side support pages keep their own components.

const BASE = '/organiser/support'

export const SUPPORT_STATUS_PILL: Record<SupportStatus, string> = {
    open: 'text-warm-red bg-warm-red/10',
    pending_user: 'text-warm-yellowText bg-warm-yellow/10',
    in_progress: 'text-cyan-600 bg-blue-500/10',
    resolved: 'text-muted bg-border',
    closed: 'text-muted bg-border',
}

const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

// ── New ticket form (used in the modal and on the standalone /new page) ──────────
export function OrganiserTicketForm({ onCancel, framed = false }: { onCancel?: () => void; framed?: boolean }) {
    const router = useRouter()
    const [subject, setSubject] = useState('')
    const [category, setCategory] = useState<SupportCategory>('general')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        if (subject.trim().length < 3) { setError('Subject must be at least 3 characters'); return }
        if (message.trim().length < 1) { setError('Message cannot be empty'); return }

        setSubmitting(true)
        try {
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || 'Failed to create ticket')
                setSubmitting(false)
                return
            }
            router.push(`${BASE}/${data.id}`)
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    const body = (
        <>
            <div className="p-6 flex flex-col gap-4">
                <div>
                    <label className="text-xs text-muted block mb-1.5">Category</label>
                    <ThemedSelect value={category} onChange={e => setCategory(e.target.value as SupportCategory)} className={modalInput}>
                        {SUPPORT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </ThemedSelect>
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1.5">Subject</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        maxLength={200}
                        placeholder="Briefly describe the issue"
                        required
                        className={modalInput}
                    />
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1.5">Message</label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        maxLength={5000}
                        rows={5}
                        placeholder="Give us as much detail as you can..."
                        required
                        className={modalInput}
                    />
                </div>
                {error && <p className="text-warm-red text-xs">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                {onCancel ? (
                    <button type="button" onClick={onCancel} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors">Cancel</button>
                ) : (
                    <Link href={BASE} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors">Cancel</Link>
                )}
                <button type="submit" disabled={submitting} className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                    {submitting ? 'Sending…' : 'Submit Ticket'}
                </button>
            </div>
        </>
    )

    return framed
        ? <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card overflow-hidden">{body}</form>
        : <form onSubmit={handleSubmit}>{body}</form>
}

// ── Ticket list + "New Ticket" modal ─────────────────────────────────────────────
export interface TicketListRow {
    id: string
    subject: string
    status: SupportStatus
    statusLabel: string
    lastReplyBy: string // "Hexlura Support" | "You" | "—"
    updatedLabel: string // e.g. "2 hours ago"
}

export function OrganiserSupportList({ tickets }: { tickets: TicketListRow[] }) {
    const [showNew, setShowNew] = useState(false)

    useEffect(() => {
        if (!showNew) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowNew(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [showNew])

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">HELP &amp; SUPPORT</h1>
                    <p className="text-muted text-sm mt-1">Get help from the Hexlura team</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    New Ticket
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {tickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted text-sm">You haven&apos;t opened any support tickets yet.</p>
                        <button type="button" onClick={() => setShowNew(true)} className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                            Create your first ticket →
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3.5 px-6">Subject</th>
                                    <th className="font-medium py-3.5 px-4">Status</th>
                                    <th className="font-medium py-3.5 px-4">Last Reply</th>
                                    <th className="font-medium py-3.5 px-6 text-right">Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(t => (
                                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                        <td className="py-3.5 px-6 font-medium max-w-[360px]">
                                            <Link href={`${BASE}/${t.id}`} className="hover:underline block truncate">{t.subject}</Link>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${SUPPORT_STATUS_PILL[t.status]}`}>{t.statusLabel}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-muted text-xs">{t.lastReplyBy}</td>
                                        <td className="py-3.5 px-6 text-right text-muted text-xs whitespace-nowrap">{t.updatedLabel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showNew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setShowNew(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">NEW TICKET</h2>
                                <p className="text-muted text-xs mt-0.5">Tell us what&apos;s going on and we&apos;ll get back to you</p>
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
                        <OrganiserTicketForm onCancel={() => setShowNew(false)} />
                    </div>
                </div>
            )}
        </>
    )
}

// ── Reply form on the ticket page ────────────────────────────────────────────────
export function OrganiserReplyForm({ ticketId }: { ticketId: string }) {
    const router = useRouter()
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        if (message.trim().length < 1) { setError('Message cannot be empty'); return }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || 'Failed to send reply')
                setSubmitting(false)
                return
            }
            setMessage('')
            setSubmitting(false)
            router.refresh()
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card p-4">
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={5000}
                rows={3}
                placeholder="Type your reply..."
                required
                aria-label="Reply"
                className={modalInput}
            />
            {error && <p className="text-warm-red text-xs mt-2">{error}</p>}
            <div className="flex justify-end mt-3">
                <button
                    type="submit"
                    disabled={submitting || message.trim().length === 0}
                    className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Sending…' : 'Send Reply'}
                </button>
            </div>
        </form>
    )
}
