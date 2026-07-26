'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'

interface RequestItem {
    id: string
    organiser_id: string | null
    org_name: string
    requester_email: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    admin_notes: string | null
    requested_at: string
    reviewed_at: string | null
    event_count: number
    confirmed_booking_count: number
}

function fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-accent bg-accent/10 border-accent/20',
    approved: 'text-success bg-success/10 border-success/20',
    rejected: 'text-muted bg-muted/10 border-muted/20',
}

export default function AccountDeletionRequestsPage() {
    const [requests, setRequests] = useState<RequestItem[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<RequestItem | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    const [error, setError] = useState('')

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/account-deletion-requests')
        const json = await res.json()
        setRequests(json.requests || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    async function handleApprove(r: RequestItem) {
        const warning = r.confirmed_booking_count > 0
            ? `This organiser has ${r.confirmed_booking_count} confirmed booking(s) across ${r.event_count} event(s). Approving will refund all of them automatically, then permanently delete the account. Continue?`
            : 'Permanently delete this account? This cannot be undone.'
        if (!confirm(warning)) return
        setActionLoading(r.id)
        setError('')
        const res = await fetch(`/api/admin/account-deletion-requests/${r.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const json = await res.json()
        if (!res.ok) setError(json.error || 'Failed to approve.')
        await fetchRequests()
        setActionLoading(null)
    }

    async function handleReject() {
        if (!rejectModal) return
        setActionLoading(rejectModal.id)
        setError('')
        const res = await fetch(`/api/admin/account-deletion-requests/${rejectModal.id}/reject`, {
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
            <h1 className="font-heading text-4xl text-text tracking-wide mb-1">ACCOUNT DELETION REQUESTS</h1>
            <p className="text-muted text-sm mb-8">Approving auto-refunds any confirmed bookings before the account is deleted.</p>

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
                                    <p className="font-semibold text-text">{r.org_name}</p>
                                    <p className="text-xs text-muted mt-0.5">{r.requester_email} · requested {fmtDate(r.requested_at)}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                            </div>
                            <div className="flex gap-6 text-sm mb-3">
                                <span className="text-text">{r.event_count} event{r.event_count === 1 ? '' : 's'}</span>
                                <span className="text-text"><strong>{r.confirmed_booking_count}</strong> confirmed booking{r.confirmed_booking_count === 1 ? '' : 's'} affected</span>
                            </div>
                            <div className="bg-background border border-border p-3 mb-4">
                                <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Organiser&apos;s reason</p>
                                <p className="text-sm text-text whitespace-pre-wrap">{r.reason}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleApprove(r)}
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
                                    <p className="font-semibold text-text truncate">{r.org_name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                                </div>
                                <p className="text-xs text-muted mt-1">
                                    {r.requester_email} · reviewed {r.reviewed_at ? fmtDate(r.reviewed_at) : '—'}
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
                        <h3 className="font-heading text-xl text-text mb-3">Reject Account Deletion?</h3>
                        <p className="text-sm text-muted mb-3">The account stays exactly as-is. Optionally tell the organiser why.</p>
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
