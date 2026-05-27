'use client'

import { useState, useMemo, Fragment } from 'react'

type RefundStatus = 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected'
type Tab = 'awaiting' | 'pending_organiser' | 'all' | 'completed'

interface RefundItem {
    id: string
    status: RefundStatus
    reason: string
    message: string | null
    refund_amount_pence: number | null
    organiser_note: string | null
    created_at: string
    resolved_at: string | null
    buyer: { full_name: string | null; email: string | null } | null
    booking: {
        id: string
        booking_ref: string
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        stripe_payment_intent_id: string | null
        user_id: string | null
        event: {
            id: string
            title: string
            organiser: { org_name: string } | null
        } | null
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
    pending: { bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid #F5A623', label: 'Pending Organiser' },
    organiser_approved: { bg: 'rgba(0,100,255,0.1)', color: '#6B9FFF', border: '1px solid #6B9FFF', label: 'Awaiting Admin' },
    organiser_rejected: { bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950', label: 'Organiser Rejected' },
    admin_approved: { bg: 'rgba(0,196,138,0.1)', color: '#00C48A', border: '1px solid #00C48A', label: 'Refunded' },
    admin_rejected: { bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950', label: 'Denied by Admin' },
}

const thStyle: React.CSSProperties = {
    background: '#F5F5F7',
    fontSize: '11px',
    color: '#666677',
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

export function AdminRefundsClient({
    requests,
    initialTab,
}: {
    requests: RefundItem[]
    initialTab: string
}) {
    const validTabs: Tab[] = ['awaiting', 'pending_organiser', 'all', 'completed']
    const validTab = (validTabs as string[]).includes(initialTab) ? initialTab as Tab : 'awaiting'
    const [tab, setTab] = useState<Tab>(validTab)
    const [items, setItems] = useState<RefundItem[]>(requests)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [forceRejectModal, setForceRejectModal] = useState<RefundItem | null>(null)
    const [forceRejectReason, setForceRejectReason] = useState('')

    // Stats (always from full list)
    const awaitingCount = items.filter(r => r.status === 'organiser_approved').length
    const pendingOrgCount = items.filter(r => r.status === 'pending').length
    const totalRefunded = items.filter(r => r.status === 'admin_approved').reduce((s, r) => s + (r.refund_amount_pence ?? r.booking?.ticket_subtotal_pence ?? 0), 0)
    const totalFeesKept = items.filter(r => r.status === 'admin_approved').reduce((s, r) => s + (r.booking?.booking_fee_pence ?? 0), 0)
    const rejectedCount = items.filter(r => r.status === 'admin_rejected' || r.status === 'organiser_rejected').length

    const filtered = useMemo(() => {
        if (tab === 'awaiting') return items.filter(r => r.status === 'organiser_approved')
        if (tab === 'pending_organiser') return items.filter(r => r.status === 'pending')
        if (tab === 'completed') return items.filter(r => r.status === 'admin_approved' || r.status === 'admin_rejected')
        return items
    }, [items, tab])

    function setError(id: string, msg: string) {
        setErrors(prev => ({ ...prev, [id]: msg }))
    }

    async function handleAction(id: string, action: 'confirm' | 'deny', bookingId: string, amountPence: number) {
        setLoadingId(id)
        setError(id, '')
        const res = await fetch('/api/admin/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId, refund_request_id: id, action, amount_pence: amountPence }),
        })
        const json = await res.json()
        setLoadingId(null)
        if (!res.ok) { setError(id, json.error || 'Something went wrong'); return }
        const newStatus: RefundStatus = action === 'confirm' ? 'admin_approved' : 'admin_rejected'
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    }

    async function handleForceApprove(id: string) {
        setLoadingId(id)
        setError(id, '')
        const res = await fetch(`/api/admin/refund-requests/${id}/approve`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        setLoadingId(null)
        if (!res.ok) { setError(id, json.error || 'Failed to force approve'); return }
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: 'admin_approved' } : r))
    }

    async function handleForceReject() {
        if (!forceRejectModal || !forceRejectReason.trim()) return
        const id = forceRejectModal.id
        setLoadingId(id)
        setError(id, '')
        const res = await fetch(`/api/admin/refund-requests/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: forceRejectReason }),
        })
        const json = await res.json().catch(() => ({}))
        setLoadingId(null)
        if (!res.ok) { setError(id, json.error || 'Failed to force reject'); return }
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: 'admin_rejected' } : r))
        setForceRejectModal(null)
        setForceRejectReason('')
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'awaiting', label: 'Awaiting Review', count: awaitingCount },
        { key: 'pending_organiser', label: 'Pending Organiser', count: pendingOrgCount },
        { key: 'all', label: 'All Requests' },
        { key: 'completed', label: 'Completed' },
    ]

    return (
        <div>
            {/* Stats Bar */}
            <div className="flex gap-4 mb-7 overflow-x-auto hide-scrollbar pb-2">
                {[
                    { label: 'Awaiting Review', value: String(awaitingCount), color: '#F5A623' },
                    { label: 'Pending Organiser', value: String(pendingOrgCount), color: '#6B9FFF' },
                    { label: 'Total Refunded', value: fmt(totalRefunded), color: '#00C48A' },
                    { label: 'Total Fees Kept', value: fmt(totalFeesKept), color: '#0A0A0F' },
                    { label: 'Rejected Total', value: String(rejectedCount), color: '#E63950' },
                ].map((stat) => (
                    <div key={stat.label} className="shrink-0" style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: '16px 20px', minWidth: '160px' }}>
                        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', color: stat.color, lineHeight: 1 }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666677', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#C0C0C8] mb-5 overflow-x-auto hide-scrollbar">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: tab === t.key ? '2px solid #E63950' : '2px solid transparent',
                            color: tab === t.key ? '#0A0A0F' : '#666677',
                            cursor: 'pointer',
                            transition: 'color 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        {t.label}
                        {t.count !== undefined && (
                            <span style={{ background: '#E63950', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', border: '1px solid #C0C0C8' }}>
                    <thead>
                        <tr>
                            {['Buyer', 'Organiser', 'Event', 'Booking Ref', 'Paid', 'Refund', 'Fee', 'Status', 'Requested', 'Action'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ ...tdBase, textAlign: 'center', color: '#666677', padding: '48px 16px' }}>
                                    No refund requests in this category
                                </td>
                            </tr>
                        ) : filtered.map(r => {
                            const badge = STATUS_BADGE[r.status]
                            const isLoading = loadingId === r.id
                            const err = errors[r.id]
                            const refundPence = r.refund_amount_pence ?? r.booking?.ticket_subtotal_pence ?? 0
                            const isAwaitingAdmin = r.status === 'organiser_approved'
                            const isPendingOrganiser = r.status === 'pending'
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
                                        <td style={{ ...tdBase, color: '#666677', fontSize: '12px' }}>
                                            {r.booking?.event?.organiser?.org_name || '—'}
                                        </td>
                                        <td style={tdBase}>{truncate(r.booking?.event?.title || '—', 28)}</td>
                                        <td style={{ ...tdBase, fontFamily: '"JetBrains Mono", monospace', color: '#E63950', whiteSpace: 'nowrap' }}>
                                            {r.booking?.booking_ref || '—'}
                                        </td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>{fmt(r.booking?.ticket_subtotal_pence ?? null)}</td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap', color: '#00C48A' }}>{fmt(refundPence)}</td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap', color: '#666677' }}>{fmt(r.booking?.booking_fee_pence ?? null)}</td>
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
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                                        <td style={tdBase}>
                                            {isAwaitingAdmin ? (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => handleAction(r.id, 'confirm', r.booking?.id ?? '', refundPence)}
                                                        disabled={isLoading}
                                                        style={{ background: '#00C48A', border: '1px solid #00C48A', color: '#FFFFFF', padding: '5px 10px', borderRadius: '2px', fontSize: '12px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap' }}
                                                    >
                                                        {isLoading ? '…' : `Confirm ${fmt(refundPence)}`}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(r.id, 'deny', r.booking?.id ?? '', refundPence)}
                                                        disabled={isLoading}
                                                        style={{ background: 'transparent', border: '1px solid #E63950', color: '#E63950', padding: '5px 10px', borderRadius: '2px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                                                    >
                                                        Deny
                                                    </button>
                                                </div>
                                            ) : isPendingOrganiser ? (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => handleForceApprove(r.id)}
                                                        disabled={isLoading}
                                                        style={{ background: '#00C48A', border: '1px solid #00C48A', color: '#FFFFFF', padding: '5px 10px', borderRadius: '2px', fontSize: '12px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap' }}
                                                        title="Approve and refund without waiting for the organiser"
                                                    >
                                                        {isLoading ? '…' : 'Force Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setForceRejectModal(r); setForceRejectReason('') }}
                                                        disabled={isLoading}
                                                        style={{ background: 'transparent', border: '1px solid #E63950', color: '#E63950', padding: '5px 10px', borderRadius: '2px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                                                        title="Reject this request without waiting for the organiser"
                                                    >
                                                        Force Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#555566' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {err && (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '0 16px 10px', borderBottom: '1px solid #C0C0C8', background: '#FFFFFF' }}>
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

            {/* Force Reject Modal — pending status only */}
            {forceRejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: '24px', maxWidth: '420px', width: '100%' }}>
                        <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', color: '#0A0A0F', marginBottom: '8px' }}>Force Reject Refund</h3>
                        <p style={{ fontSize: '13px', color: '#666677', marginBottom: '16px', fontFamily: '"JetBrains Mono", monospace' }}>
                            {forceRejectModal.booking?.booking_ref}
                        </p>
                        <textarea
                            value={forceRejectReason}
                            onChange={e => setForceRejectReason(e.target.value)}
                            placeholder="Admin reason for rejection (required)"
                            rows={3}
                            style={{ width: '100%', background: '#F5F5F7', border: '1px solid #C0C0C8', padding: '8px 12px', fontSize: '13px', color: '#0A0A0F', resize: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleForceReject}
                                disabled={loadingId === forceRejectModal.id || !forceRejectReason.trim()}
                                style={{ background: '#E63950', border: '1px solid #E63950', color: '#FFFFFF', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (loadingId === forceRejectModal.id || !forceRejectReason.trim()) ? 0.5 : 1 }}
                            >
                                {loadingId === forceRejectModal.id ? 'Rejecting…' : 'Reject Request'}
                            </button>
                            <button
                                onClick={() => { setForceRejectModal(null); setForceRejectReason('') }}
                                style={{ background: 'transparent', border: '1px solid #C0C0C8', color: '#0A0A0F', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
