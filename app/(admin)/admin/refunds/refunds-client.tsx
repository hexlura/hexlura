'use client'

import { useState } from 'react'
import { formatPence } from '@/lib/fees'

type RefundStatus = 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected'

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
        total_pence: number | null
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        stripe_payment_intent_id: string | null
        user_id: string | null
        event: {
            id: string
            title: string
            organiser: { org_name: string } | null
        } | null
        items: { quantity: number; ticket_type: { name: string } | null }[] | null
    } | null
}

type Tab = 'pending_admin' | 'all' | 'completed'

const STATUS_LABELS: Record<RefundStatus, string> = {
    pending: 'Pending Organiser',
    organiser_approved: 'Awaiting Admin',
    organiser_rejected: 'Organiser Rejected',
    admin_approved: 'Approved',
    admin_rejected: 'Denied',
}

const STATUS_COLORS: Record<RefundStatus, string> = {
    pending: '#F5A623',
    organiser_approved: '#7C7CFF',
    organiser_rejected: '#E63950',
    admin_approved: '#00E5A0',
    admin_rejected: '#E63950',
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AdminRefundCard({
    request,
    onUpdate,
}: {
    request: RefundItem
    onUpdate: (id: string, newStatus: RefundStatus) => void
}) {
    const [loading, setLoading] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const booking = request.booking
    const refundPence = request.refund_amount_pence ?? booking?.ticket_subtotal_pence ?? 0
    const feePence = booking?.booking_fee_pence ?? 0
    const totalPence = booking?.total_pence ?? 0

    async function handleAdminAction(action: 'confirm' | 'deny') {
        setLoading(true)
        setErrorMsg('')

        const res = await fetch('/api/admin/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: booking?.id,
                refund_request_id: request.id,
                action,
                amount_pence: refundPence,
            }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            setErrorMsg(json.error || 'Something went wrong')
            return
        }

        const newStatus: RefundStatus = action === 'confirm' ? 'admin_approved' : 'admin_rejected'
        setSuccessMsg(action === 'confirm' ? `Refund of ${formatPence(refundPence)} processed` : 'Refund denied')
        onUpdate(request.id, newStatus)
    }

    const isActionable = request.status === 'organiser_approved'

    return (
        <div style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0F0F8' }}>
                            {request.buyer?.full_name || 'Guest'}
                        </p>
                        <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '2px',
                            background: `${STATUS_COLORS[request.status]}18`,
                            color: STATUS_COLORS[request.status],
                            border: `1px solid ${STATUS_COLORS[request.status]}44`,
                        }}>
                            {STATUS_LABELS[request.status]}
                        </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#8888AA', marginBottom: '8px' }}>{request.buyer?.email || '—'}</p>

                    <p style={{ fontSize: '13px', color: '#F0F0F8', fontWeight: 500 }}>{booking?.event?.title || 'Unknown Event'}</p>
                    {booking?.event?.organiser && (
                        <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '1px' }}>by {booking.event.organiser.org_name}</p>
                    )}
                    <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '2px', fontFamily: 'monospace' }}>{booking?.booking_ref}</p>

                    {booking?.items && booking.items.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '4px' }}>
                            {booking.items.map(i => `${i.ticket_type?.name || 'Ticket'} × ${i.quantity}`).join(', ')}
                        </p>
                    )}
                </div>

                <div style={{ textAlign: 'right', minWidth: '160px' }}>
                    <p style={{ fontSize: '11px', color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Paid</p>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0F0F8' }}>{formatPence(totalPence)}</p>
                    <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refund Amount</p>
                    <p style={{ fontSize: '17px', fontWeight: 700, color: '#00E5A0' }}>{formatPence(refundPence)}</p>
                    {feePence > 0 && (
                        <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '2px' }}>
                            Booking fee of {formatPence(feePence)} will NOT be refunded
                        </p>
                    )}
                </div>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid #2A2A3A' }}>
                <p style={{ fontSize: '12px', color: '#8888AA', marginBottom: '2px' }}>Buyer reason</p>
                <p style={{ fontSize: '13px', color: '#F0F0F8' }}>{request.reason}</p>
                {request.message && (
                    <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '4px', fontStyle: 'italic' }}>{request.message}</p>
                )}
                {request.organiser_note && (
                    <p style={{ fontSize: '12px', color: '#F5A623', marginTop: '6px' }}>
                        Organiser note: {request.organiser_note}
                    </p>
                )}
                <p style={{ fontSize: '11px', color: '#555566', marginTop: '6px' }}>Requested {fmtDate(request.created_at)}</p>
            </div>

            {successMsg && (
                <p style={{ fontSize: '13px', color: '#00E5A0', marginTop: '12px', fontWeight: 600 }}>{successMsg}</p>
            )}

            {errorMsg && (
                <p style={{ fontSize: '12px', color: '#E63950', marginTop: '8px' }}>{errorMsg}</p>
            )}

            {isActionable && !successMsg && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                        onClick={() => handleAdminAction('confirm')}
                        disabled={loading}
                        style={{
                            background: '#00E5A0',
                            border: '1px solid #00E5A0',
                            color: '#0A0A0F',
                            padding: '8px 20px',
                            borderRadius: '2px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Processing...' : `Confirm Refund — ${formatPence(refundPence)}`}
                    </button>
                    <button
                        onClick={() => handleAdminAction('deny')}
                        disabled={loading}
                        style={{
                            background: 'transparent',
                            border: '1px solid #E63950',
                            color: '#E63950',
                            padding: '8px 20px',
                            borderRadius: '2px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#E63950'; (e.currentTarget as HTMLButtonElement).style.color = '#ffffff' } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#E63950' }}
                    >
                        Deny Refund
                    </button>
                </div>
            )}
        </div>
    )
}

export function AdminRefundsClient({
    requests,
    initialTab,
}: {
    requests: RefundItem[]
    initialTab: string
}) {
    const [tab, setTab] = useState<Tab>((initialTab as Tab) || 'pending_admin')
    const [items, setItems] = useState(requests)

    function handleUpdate(id: string, newStatus: RefundStatus) {
        setItems(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: 'pending_admin', label: 'Awaiting Admin Review' },
        { key: 'all', label: 'All Requests' },
        { key: 'completed', label: 'Completed' },
    ]

    const filtered = items.filter(r => {
        if (tab === 'pending_admin') return r.status === 'organiser_approved'
        if (tab === 'completed') return r.status === 'admin_approved' || r.status === 'admin_rejected'
        return true
    })

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #2A2A3A', marginBottom: '24px' }}>
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
                        }}
                    >
                        {t.label}
                        {t.key === 'pending_admin' && (
                            <span style={{ marginLeft: '6px', background: '#E63950', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>
                                {items.filter(r => r.status === 'organiser_approved').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#8888AA', padding: '40px 0' }}>No refund requests in this category</p>
            ) : (
                filtered.map(r => (
                    <AdminRefundCard key={r.id} request={r} onUpdate={handleUpdate} />
                ))
            )}
        </div>
    )
}
