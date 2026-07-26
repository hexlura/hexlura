'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'

interface RequestItem {
    id: string
    event_id: string | null
    event_title: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    previous_status: string
    admin_notes: string | null
    requested_at: string
    reviewed_at: string | null
    organiser: { org_name: string } | null
    event: { status: string } | null
    confirmed_booking_count: number
    revenue_pence: number
}

function fmtPence(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
}

function fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-accent bg-accent/10 border-accent/20',
    approved: 'text-success bg-success/10 border-success/20',
    rejected: 'text-muted bg-muted/10 border-muted/20',
}

export default function EventDeletionRequestsPage() {
    const [requests, setRequests] = useState<RequestItem[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<RequestItem | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    const [error, setError] = useState('')

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/event-deletion-requests')
        const json = await res.json()
        setRequests(json.requests || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    async function handleApprove(id: string) {
        if (!confirm('Approve this deletion? If the event has confirmed bookings, they will be automatically refunded first.')) return
        setActionLoading(id)
        setError('')
        const res = await fetch(`/api/admin/event-deletion-requests/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const json = await res.json()
        if (!res.ok) setError(json.error || 'Failed to approve.')
        await fetchRequests()
        setActionLoading(null)
    }

    async function handleReject() {
        if (!rejectModal) return
        setActionLoading(rejectModal.id)
        setError('')
        const res = await fetch(`/api/admin/event-deletion-requests/${rejectModal.id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: rejectNotes }),
        })
        const json = await res.json()
        if (!res.ok) setError(json.error || 'Failed to reject.')
        setRejectModal(null)
        setRejectNotes('')
        await fetchRequests()
        setActionLoading(null)
    }

    const pending = requests.filter(r => r.status === 'pending')
    const resolved = requests.filter(r => r.status !== 'pending')

    return (
        <div className="max-w-5xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-1">EVENT DELETION REQUESTS</h1>
            <p className="text-muted text-sm mb-8">Events stay unpublished, not deleted, until you decide.</p>

            {error && <p className="text-accent text-sm mb-4">{error}</p>}

            {loading ? (
                <p className="text-muted text-center py-12">Loading…</p>
            ) : pending.length === 0 ? (
                <p className="text-muted text-center py-12">No pending requests.</p>
            ) : (
                <div className="space-y-4 mb-12">
                    {pending.map(r => (
                        <div key={r.id} className="bg-surface border border-border rounded-none p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                                <div>
                                    <p className="font-semibold text-text">{r.event_title}</p>
                                    <p className="text-xs text-muted mt-0.5">{r.organiser?.org_name} · requested {fmtDate(r.requested_at)}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                            </div>
                            <div className="flex gap-6 text-sm mb-3">
                                <span className="text-text"><strong>{r.confirmed_booking_count}</strong> confirmed booking{r.confirmed_booking_count === 1 ? '' : 's'}</span>
                                <span className="text-text">{fmtPence(r.revenue_pence)} revenue</span>
                            </div>
                            <div className="bg-background border border-border p-3 mb-4">
                                <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Organiser&apos;s reason</p>
                                <p className="text-sm text-text whitespace-pre-wrap">{r.reason}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleApprove(r.id)}
                                    disabled={actionLoading === r.id}
                                    className="h-9 px-5 rounded-sm bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {actionLoading === r.id ? 'Working…' : 'Approve'}
                                </button>
                                <button
                                    onClick={() => { setRejectModal(r); setRejectNotes('') }}
                                    disabled={actionLoading === r.id}
                                    className="h-9 px-5 rounded-sm border border-border text-text text-sm hover:bg-card transition disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {resolved.length > 0 && (
                <>
                    <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">History</h2>
                    <div className="space-y-2">
                        {resolved.map(r => (
                            <div key={r.id} className="bg-surface border border-border rounded-none p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-text truncate">{r.event_title}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                                </div>
                                <p className="text-xs text-muted mt-1">
                                    {r.organiser?.org_name} · reviewed {r.reviewed_at ? fmtDate(r.reviewed_at) : '—'}
                                    {r.admin_notes ? ` · "${r.admin_notes}"` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {rejectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Reject Deletion Request?</h3>
                        <p className="text-sm text-muted mb-3">The event will go back to its previous status. Optionally tell the organiser why.</p>
                        <textarea
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            rows={3}
                            placeholder="Reason (optional)"
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent resize-y mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={handleReject} disabled={actionLoading === rejectModal.id} className="h-10 px-5 rounded-sm bg-accent text-white text-sm font-semibold disabled:opacity-50">
                                {actionLoading === rejectModal.id ? 'Working…' : 'Confirm Reject'}
                            </button>
                            <button onClick={() => setRejectModal(null)} className="h-10 px-5 rounded-sm border border-border text-text text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
