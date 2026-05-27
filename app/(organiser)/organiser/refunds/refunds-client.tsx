'use client'

import { useState, useMemo, Fragment } from 'react'

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
        booking_fee_pence: number | null
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

function truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n) + '…' : s
}

const STATUS_BADGE: Record<RefundStatus, { bg: string; color: string; border: string; label: string }> = {
    pending: { bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid #F5A623', label: 'Pending' },
    organiser_approved: { bg: 'rgba(0,100,255,0.1)', color: '#6B9FFF', border: '1px solid #6B9FFF', label: 'Awaiting Admin' },
    organiser_rejected: { bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950', label: 'Rejected by You' },
    admin_approved: { bg: 'rgba(0,229,160,0.1)', color: '#00E5A0', border: '1px solid #00E5A0', label: 'Refunded' },
    admin_rejected: { bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950', label: 'Denied by Admin' },
}

const dropdownStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #C0C0C8',
    color: '#0A0A0F',
    padding: '8px 12px',
    borderRadius: '2px',
    fontSize: '13px',
    cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
    background: '#F0F0F0',
    fontSize: '11px',
    color: '#0A0A0F',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    whiteSpace: 'nowrap',
}

const tdBase: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#0A0A0F',
    borderBottom: '1px solid #C0C0C8',
    verticalAlign: 'top',
}

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
    const totalRefunded = items
        .filter(r => r.status === 'admin_approved')
        .reduce((sum, r) => sum + (r.refund_amount_pence ?? r.booking?.ticket_subtotal_pence ?? 0), 0)

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

    return (
        <div>
            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }} className="sm:grid-cols-4" >
                {[
                    { label: 'Pending', value: String(pending), color: '#F5A623' },
                    { label: 'Approved by You', value: String(approved), color: '#00E5A0' },
                    { label: 'Rejected', value: String(rejected), color: '#E63950' },
                    { label: 'Total Refunded', value: fmt(totalRefunded), color: '#0A0A0F' },
                ].map((stat) => (
                    <div key={stat.label} style={{ background: '#F5F5F7', border: '1px solid #C0C0C8', padding: '16px 20px' }}>
                        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', color: stat.color, lineHeight: 1 }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666677', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={dropdownStyle}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={dropdownStyle}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_high">Amount High-Low</option>
                    <option value="amount_low">Amount Low-High</option>
                </select>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', border: '1px solid #C0C0C8' }}>
                    <thead>
                        <tr>
                            {['Buyer', 'Event', 'Booking Ref', 'Ticket Amount', 'Refund Amount', 'Fee Kept', 'Requested', 'Status', 'Action'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ ...tdBase, textAlign: 'center', color: '#666677', padding: '48px 16px' }}>
                                    No refund requests found
                                </td>
                            </tr>
                        ) : filtered.map(r => {
                            const badge = STATUS_BADGE[r.status]
                            const isRejecting = rejectingId === r.id
                            const isLoading = loadingId === r.id
                            const err = errors[r.id]
                            return (
                                <Fragment key={r.id}>
                                    <tr
                                        style={{ background: 'transparent', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F5F5F7'}
                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                    >
                                        <td style={tdBase}>
                                            <div style={{ fontWeight: 500 }}>{r.buyer?.full_name || 'Guest'}</div>
                                            <div style={{ fontSize: '12px', color: '#666677', marginTop: '2px' }}>{r.buyer?.email || '—'}</div>
                                        </td>
                                        <td style={tdBase}>{truncate(r.booking?.event?.title || '—', 30)}</td>
                                        <td style={{ ...tdBase, fontFamily: '"JetBrains Mono", monospace', color: '#E63950' }}>
                                            {r.booking?.booking_ref || '—'}
                                        </td>
                                        <td style={tdBase}>{fmt(r.booking?.ticket_subtotal_pence ?? null)}</td>
                                        <td style={tdBase}>{fmt(r.refund_amount_pence)}</td>
                                        <td style={{ ...tdBase, color: '#666677' }}>{fmt(r.booking?.booking_fee_pence ?? null)}</td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                                        <td style={tdBase}>
                                            <span style={{
                                                background: badge.bg,
                                                color: badge.color,
                                                border: badge.border,
                                                padding: '3px 8px',
                                                fontSize: '11px',
                                                borderRadius: '2px',
                                                whiteSpace: 'nowrap',
                                                display: 'inline-block',
                                            }}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td style={tdBase}>
                                            {r.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => handleApprove(r.id)}
                                                        disabled={isLoading}
                                                        style={{ background: 'transparent', border: '1px solid #0A0A0F', color: '#0A0A0F', padding: '4px 10px', borderRadius: '2px', fontSize: '12px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setRejectingId(r.id); setRejectNote('') }}
                                                        disabled={isLoading}
                                                        style={{ background: 'transparent', border: '1px solid #E63950', color: '#E63950', padding: '4px 10px', borderRadius: '2px', fontSize: '12px', cursor: isLoading ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#555566' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isRejecting && (
                                        <tr style={{ background: '#F5F5F7' }}>
                                            <td colSpan={9} style={{ padding: '12px 16px', borderBottom: '1px solid #C0C0C8' }}>
                                                <textarea
                                                    value={rejectNote}
                                                    onChange={e => setRejectNote(e.target.value)}
                                                    rows={2}
                                                    placeholder="Reason for rejection (optional)..."
                                                    style={{ width: '100%', background: '#FFFFFF', border: '1px solid #C0C0C8', color: '#0A0A0F', padding: '8px 12px', fontSize: '13px', borderRadius: '2px', resize: 'vertical', boxSizing: 'border-box' }}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    <button
                                                        onClick={() => handleReject(r.id)}
                                                        disabled={isLoading}
                                                        style={{ background: '#E63950', border: '1px solid #E63950', color: '#fff', padding: '6px 14px', borderRadius: '2px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
                                                    >
                                                        {isLoading ? 'Processing...' : 'Confirm Reject'}
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectingId(null)}
                                                        style={{ background: 'transparent', border: '1px solid #C0C0C8', color: '#666677', padding: '6px 14px', borderRadius: '2px', fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                                {err && <p style={{ fontSize: '12px', color: '#E63950', marginTop: '6px' }}>{err}</p>}
                                            </td>
                                        </tr>
                                    )}
                                    {err && !isRejecting && (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '0 16px 10px', borderBottom: '1px solid #C0C0C8', background: '#F5F5F7' }}>
                                                <span style={{ fontSize: '12px', color: '#E63950' }}>{err}</span>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile card list */}
            <div className="block sm:hidden space-y-4">
                {filtered.length === 0 && (
                    <p className="text-center text-sm" style={{ color: '#666677', padding: '48px 16px' }}>No refund requests found</p>
                )}
                {filtered.map(r => {
                    const badge = STATUS_BADGE[r.status]
                    const isLoading = loadingId === r.id
                    const isRejecting = rejectingId === r.id
                    const err = errors[r.id]
                    return (
                        <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: '16px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0A0A0F' }}>{r.buyer?.full_name || 'Guest'}</div>
                            <div style={{ fontSize: '12px', color: '#666677', marginBottom: '8px' }}>{r.buyer?.email || '—'}</div>
                            <div style={{ fontSize: '13px', color: '#0A0A0F', marginBottom: '4px' }}>{truncate(r.booking?.event?.title || '—', 40)}</div>
                            <div style={{ fontFamily: '"JetBrains Mono", monospace', color: '#E63950', fontSize: '12px', marginBottom: '8px' }}>
                                {r.booking?.booking_ref || '—'}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#0A0A0F', marginBottom: '8px' }}>
                                <span>Tickets: {fmt(r.booking?.ticket_subtotal_pence ?? null)}</span>
                                <span>Refund: {fmt(r.refund_amount_pence)}</span>
                            </div>
                            <span style={{
                                background: badge.bg, color: badge.color, border: badge.border,
                                padding: '3px 8px', fontSize: '11px', borderRadius: '2px', display: 'inline-block', marginBottom: '12px',
                            }}>
                                {badge.label}
                            </span>
                            {r.status === 'pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {!isRejecting ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(r.id)}
                                                disabled={isLoading}
                                                style={{ width: '100%', background: 'transparent', border: '1px solid #0A0A0F', color: '#0A0A0F', padding: '10px', borderRadius: '2px', fontSize: '13px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
                                            >
                                                {isLoading ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => { setRejectingId(r.id); setRejectNote('') }}
                                                disabled={isLoading}
                                                style={{ width: '100%', background: 'transparent', border: '1px solid #E63950', color: '#E63950', padding: '10px', borderRadius: '2px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <textarea
                                                value={rejectNote}
                                                onChange={e => setRejectNote(e.target.value)}
                                                rows={2}
                                                placeholder="Reason for rejection (optional)..."
                                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #C0C0C8', color: '#0A0A0F', padding: '8px 12px', fontSize: '13px', borderRadius: '2px', resize: 'vertical', boxSizing: 'border-box' }}
                                            />
                                            <button
                                                onClick={() => handleReject(r.id)}
                                                disabled={isLoading}
                                                style={{ width: '100%', background: '#E63950', border: '1px solid #E63950', color: '#fff', padding: '10px', borderRadius: '2px', fontSize: '13px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
                                            >
                                                {isLoading ? 'Processing...' : 'Confirm Reject'}
                                            </button>
                                            <button
                                                onClick={() => setRejectingId(null)}
                                                style={{ width: '100%', background: 'transparent', border: '1px solid #C0C0C8', color: '#666677', padding: '10px', borderRadius: '2px', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                    {err && <p style={{ fontSize: '12px', color: '#E63950' }}>{err}</p>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
