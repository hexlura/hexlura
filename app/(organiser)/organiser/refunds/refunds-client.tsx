'use client'

import { useState, useMemo, Fragment } from 'react'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

type RefundStatus = 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected'

interface RefundItem {
    id: string
    status: RefundStatus
    reason: string
    message: string | null
    organiser_note: string | null
    refund_amount_pence: number | null
    created_at: string
    buyer: { full_name: string | null; email: string | null } | null
    booking: {
        id: string
        booking_ref: string
        ticket_subtotal_pence: number | null
        discount_pence: number | null
        user_id: string | null
        event: { title: string } | null
    } | null
}

function fmt(pence: number | null): string {
    if (!pence && pence !== 0) return '£0.00'
    return `£${(pence / 100).toFixed(2)}`
}

function fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_BADGE: Record<RefundStatus, { cls: string; label: string }> = {
    pending: { cls: 'text-warm-yellowText bg-warm-yellow/10', label: 'Pending' },
    organiser_approved: { cls: 'text-cyan-600 bg-blue-500/10', label: 'Awaiting Admin' },
    organiser_rejected: { cls: 'text-warm-red bg-warm-red/10', label: 'Rejected by You' },
    admin_approved: { cls: 'text-warm-green bg-warm-green/10', label: 'Refunded' },
    admin_rejected: { cls: 'text-warm-red bg-warm-red/10', label: 'Denied by Admin' },
}

const filterSelect = 'bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none'

export function OrganiserRefundsClient({ requests }: { requests: RefundItem[] }) {
    const [items, setItems] = useState<RefundItem[]>(requests)
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortBy, setSortBy] = useState('latest')
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectNote, setRejectNote] = useState('')
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Stats (always from full list, not filtered)
    const pending = items.filter(r => r.status === 'pending').length
    const approved = items.filter(r => r.status === 'organiser_approved' || r.status === 'admin_approved').length
    const rejected = items.filter(r => r.status === 'organiser_rejected' || r.status === 'admin_rejected').length

    const filtered = useMemo(() => {
        let list = [...items]
        if (filterStatus === 'pending') list = list.filter(r => r.status === 'pending')
        else if (filterStatus === 'approved') list = list.filter(r => r.status === 'organiser_approved' || r.status === 'admin_approved')
        else if (filterStatus === 'rejected') list = list.filter(r => r.status === 'organiser_rejected' || r.status === 'admin_rejected')
        else if (filterStatus === 'refunded') list = list.filter(r => r.status === 'admin_approved')

        if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        else if (sortBy === 'latest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        else if (sortBy === 'amount_high') list.sort((a, b) => (b.refund_amount_pence ?? 0) - (a.refund_amount_pence ?? 0))
        else if (sortBy === 'amount_low') list.sort((a, b) => (a.refund_amount_pence ?? 0) - (b.refund_amount_pence ?? 0))
        return list
    }, [items, filterStatus, sortBy])

    function setError(id: string, msg: string) {
        setErrors(prev => ({ ...prev, [id]: msg }))
    }

    async function handleApprove(id: string) {
        setLoadingId(id)
        setError(id, '')
        const res = await fetch('/api/organiser/refunds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refund_request_id: id, action: 'approve' }),
        })
        const json = await res.json()
        setLoadingId(null)
        if (!res.ok) { setError(id, json.error || 'Something went wrong'); return }
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: 'organiser_approved' } : r))
    }

    async function handleReject(id: string) {
        setLoadingId(id)
        setError(id, '')
        const res = await fetch('/api/organiser/refunds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refund_request_id: id, action: 'reject', organiser_note: rejectNote.trim() || undefined }),
        })
        const json = await res.json()
        setLoadingId(null)
        if (!res.ok) { setError(id, json.error || 'Something went wrong'); return }
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: 'organiser_rejected' } : r))
        setRejectingId(null)
        setRejectNote('')
    }

    const stats = [
        { label: 'Pending', value: String(pending), cls: 'text-accent' },
        { label: 'Approved by You', value: String(approved), cls: 'text-warm-green' },
        { label: 'Rejected', value: String(rejected), cls: '' },
    ]

    return (
        <div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-card rounded-2xl shadow-card p-4">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</p>
                        <p className={`font-heading text-2xl ${s.cls}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter + Sort */}
            <div className="flex gap-3 mb-4">
                <ThemedSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" className={filterSelect}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                </ThemedSelect>
                <ThemedSelect value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort refund requests" className={filterSelect}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_high">Amount: High to Low</option>
                    <option value="amount_low">Amount: Low to High</option>
                </ThemedSelect>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-card rounded-2xl shadow-card overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="text-center text-muted text-sm py-16">No refund requests found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3.5 px-6">Buyer</th>
                                    <th className="font-medium py-3.5 px-4">Event</th>
                                    <th className="font-medium py-3.5 px-4">Booking Ref</th>
                                    <th className="font-medium py-3.5 px-4 text-right">Ticket Amount</th>
                                    <th className="font-medium py-3.5 px-4 text-right">Refund Amount</th>
                                    <th className="font-medium py-3.5 px-4">Requested</th>
                                    <th className="font-medium py-3.5 px-4">Status</th>
                                    <th className="font-medium py-3.5 px-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => {
                                    const badge = STATUS_BADGE[r.status]
                                    const isRejecting = rejectingId === r.id
                                    const isLoading = loadingId === r.id
                                    const err = errors[r.id]
                                    return (
                                        <Fragment key={r.id}>
                                            <tr className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors align-top">
                                                <td className="py-3.5 px-6 font-medium" title={r.buyer?.email || undefined}>{r.buyer?.full_name || 'Guest'}</td>
                                                <td className="py-3.5 px-4 text-muted truncate max-w-[120px]" title={r.booking?.event?.title || undefined}>{r.booking?.event?.title || '—'}</td>
                                                <td className="py-3.5 px-4 font-mono text-xs text-accent">{r.booking?.booking_ref || '—'}</td>
                                                <td className="py-3.5 px-4 text-right font-medium">{fmt(r.booking?.ticket_subtotal_pence ?? null)}</td>
                                                <td className="py-3.5 px-4 text-right font-medium">{fmt(r.refund_amount_pence)}</td>
                                                <td className="py-3.5 px-4 text-muted text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                                                </td>
                                                <td className="py-3.5 px-6 text-right">
                                                    {r.status === 'pending' ? (
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex justify-end gap-3 text-xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleApprove(r.id)}
                                                                    disabled={isLoading}
                                                                    className="text-warm-green font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {isLoading && !isRejecting ? 'Processing...' : 'Approve'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setRejectingId(isRejecting ? null : r.id); setRejectNote('') }}
                                                                    disabled={isLoading}
                                                                    className="text-accent font-semibold hover:underline disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                            {isRejecting && (
                                                                <div className="w-56">
                                                                    <textarea
                                                                        value={rejectNote}
                                                                        onChange={e => setRejectNote(e.target.value)}
                                                                        rows={2}
                                                                        placeholder="Reason for rejection (optional)..."
                                                                        className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none mb-1.5"
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <button type="button" onClick={() => setRejectingId(null)} className="text-[11px] text-muted hover:text-text">Cancel</button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleReject(r.id)}
                                                                            disabled={isLoading}
                                                                            className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-lg disabled:opacity-50"
                                                                        >
                                                                            {isLoading ? 'Processing...' : 'Confirm Reject'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {err && <p className="text-xs text-warm-red max-w-[14rem] text-right">{err}</p>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile card list (the design is desktop-only; same visual language) */}
            <div className="block sm:hidden space-y-3">
                {filtered.length === 0 && (
                    <div className="bg-card rounded-2xl shadow-card p-12 text-center text-muted text-sm">No refund requests found</div>
                )}
                {filtered.map(r => {
                    const badge = STATUS_BADGE[r.status]
                    const isLoading = loadingId === r.id
                    const isRejecting = rejectingId === r.id
                    const err = errors[r.id]
                    return (
                        <div key={r.id} className="bg-card rounded-2xl shadow-card p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm">{r.buyer?.full_name || 'Guest'}</p>
                                    <p className="text-xs text-muted truncate">{r.booking?.event?.title || '—'}</p>
                                </div>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                            </div>
                            <p className="font-mono text-xs text-accent mt-2">{r.booking?.booking_ref || '—'}</p>
                            <div className="flex gap-4 text-xs mt-2">
                                <span>Tickets: <span className="font-medium">{fmt(r.booking?.ticket_subtotal_pence ?? null)}</span></span>
                                <span>Refund: <span className="font-medium">{fmt(r.refund_amount_pence)}</span></span>
                            </div>
                            <p className="text-xs text-muted mt-1">{fmtDate(r.created_at)}</p>
                            {r.status === 'pending' && (
                                <div className="mt-3 flex flex-col gap-2">
                                    {!isRejecting ? (
                                        <div className="flex gap-3 text-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(r.id)}
                                                disabled={isLoading}
                                                className="flex-1 border border-border rounded-xl py-2.5 font-semibold text-warm-green disabled:opacity-50"
                                            >
                                                {isLoading ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setRejectingId(r.id); setRejectNote('') }}
                                                disabled={isLoading}
                                                className="flex-1 border border-border rounded-xl py-2.5 font-semibold text-accent disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <textarea
                                                value={rejectNote}
                                                onChange={e => setRejectNote(e.target.value)}
                                                rows={2}
                                                placeholder="Reason for rejection (optional)..."
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                            />
                                            <div className="flex gap-3 text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setRejectingId(null)}
                                                    className="flex-1 border border-border rounded-xl py-2.5 text-muted"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReject(r.id)}
                                                    disabled={isLoading}
                                                    className="flex-1 bg-accent text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
                                                >
                                                    {isLoading ? 'Processing...' : 'Confirm Reject'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {err && <p className="text-xs text-warm-red">{err}</p>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
