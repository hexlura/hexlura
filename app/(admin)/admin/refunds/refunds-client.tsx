'use client'

import { useState, useMemo, Fragment } from 'react'

type RefundStatus = 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected'
type Tab = 'awaiting' | 'all' | 'completed'

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
    admin_approved: { bg: 'rgba(0,229,160,0.1)', color: '#00E5A0', border: '1px solid #00E5A0', label: 'Refunded' },
    admin_rejected: { bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950', label: 'Denied by Admin' },
}

const thStyle: React.CSSProperties = {
    background: '#0A0A0F',
    fontSize: '11px',
    color: '#8888AA',
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
    color: '#F0F0F8',
    borderBottom: '1px solid #2A2A3A',
    verticalAlign: 'top',
}

export function AdminRefundsClient({
    requests,
    initialTab,
}: {
    requests: RefundItem[]
    initialTab: string
}) {
    const validTab = (initialTab === 'awaiting' || initialTab === 'all' || initialTab === 'completed') ? initialTab as Tab : 'awaiting'
    const [tab, setTab] = useState<Tab>(validTab)
    const [items, setItems] = useState<RefundItem[]>(requests)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Stats (always from full list)
    const awaitingCount = items.filter(r => r.status === 'organiser_approved').length
    const pendingOrgCount = items.filter(r => r.status === 'pending').length
    const totalRefunded = items.filter(r => r.status === 'admin_approved').reduce((s, r) => s + (r.refund_amount_pence ?? 0), 0)
    const totalFeesKept = items.filter(r => r.status === 'admin_approved').reduce((s, r) => s + (r.booking?.booking_fee_pence ?? 0), 0)
    const rejectedCount = items.filter(r => r.status === 'admin_rejected' || r.status === 'organiser_rejected').length

    const filtered = useMemo(() => {
        if (tab === 'awaiting') return items.filter(r => r.status === 'organiser_approved')
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

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'awaiting', label: 'Awaiting Review', count: awaitingCount },
        { key: 'all', label: 'All Requests' },
        { key: 'completed', label: 'Completed' },
    ]

    return (
        <div>
            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: 'Awaiting Review', value: String(awaitingCount), color: '#F5A623' },
                    { label: 'Pending Organiser', value: String(pendingOrgCount), color: '#6B9FFF' },
                    { label: 'Total Refunded', value: fmt(totalRefunded), color: '#00E5A0' },
                    { label: 'Total Fees Kept', value: fmt(totalFeesKept), color: '#F0F0F8' },
                    { label: 'Rejected Total', value: String(rejectedCount), color: '#E63950' },
                ].map((stat) => (
                    <div key={stat.label} style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '16px 20px' }}>
                        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', color: stat.color, lineHeight: 1 }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8888AA', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #2A2A3A', marginBottom: '20px' }}>
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
                            color: tab === t.key ? '#F0F0F8' : '#8888AA',
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
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#13131A', border: '1px solid #2A2A3A' }}>
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
                                <td colSpan={10} style={{ ...tdBase, textAlign: 'center', color: '#8888AA', padding: '48px 16px' }}>
                                    No refund requests in this category
                                </td>
                            </tr>
                        ) : filtered.map(r => {
                            const badge = STATUS_BADGE[r.status]
                            const isLoading = loadingId === r.id
                            const err = errors[r.id]
                            const refundPence = r.refund_amount_pence ?? r.booking?.ticket_subtotal_pence ?? 0
                            const isActionable = r.status === 'organiser_approved'
                            return (
                                <Fragment key={r.id}>
                                    <tr
                                        style={{ background: 'transparent', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A24'}
                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                    >
                                        <td style={tdBase}>
                                            <div style={{ fontWeight: 500 }}>{r.buyer?.full_name || 'Guest'}</div>
                                            <div style={{ fontSize: '12px', color: '#8888AA', marginTop: '2px' }}>{r.buyer?.email || '—'}</div>
                                        </td>
                                        <td style={{ ...tdBase, color: '#8888AA', fontSize: '12px' }}>
                                            {r.booking?.event?.organiser?.org_name || '—'}
                                        </td>
                                        <td style={tdBase}>{truncate(r.booking?.event?.title || '—', 28)}</td>
                                        <td style={{ ...tdBase, fontFamily: '"JetBrains Mono", monospace', color: '#E63950', whiteSpace: 'nowrap' }}>
                                            {r.booking?.booking_ref || '—'}
                                        </td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>{fmt(r.booking?.ticket_subtotal_pence ?? null)}</td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap', color: '#00E5A0' }}>{fmt(refundPence)}</td>
                                        <td style={{ ...tdBase, whiteSpace: 'nowrap', color: '#8888AA' }}>{fmt(r.booking?.booking_fee_pence ?? null)}</td>
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
                                            {isActionable ? (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => handleAction(r.id, 'confirm', r.booking?.id ?? '', refundPence)}
                                                        disabled={isLoading}
                                                        style={{ background: '#00E5A0', border: '1px solid #00E5A0', color: '#0A0A0F', padding: '5px 10px', borderRadius: '2px', fontSize: '12px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap' }}
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
                                            ) : (
                                                <span style={{ color: '#555566' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {err && (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '0 16px 10px', borderBottom: '1px solid #2A2A3A', background: '#13131A' }}>
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
        </div>
    )
}
