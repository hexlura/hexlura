'use client'

import { useState } from 'react'
import { formatPence } from '@/lib/fees'

interface RefundItem {
    id: string
    status: string
    reason: string
    message: string | null
    refund_amount_pence: number | null
    created_at: string
    buyer: { full_name: string | null; email: string | null } | null
    booking: {
        id: string
        booking_ref: string
        total_pence: number | null
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        user_id: string | null
        event: { id: string; title: string } | null
        items: { quantity: number; ticket_type: { name: string } | null }[] | null
    } | null
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function RefundCard({ request, onRemove }: { request: RefundItem; onRemove: (id: string) => void }) {
    const [rejecting, setRejecting] = useState(false)
    const [organiserNote, setOrganiserNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const booking = request.booking
    const totalPence = booking?.total_pence ?? 0
    const refundPence = request.refund_amount_pence ?? booking?.ticket_subtotal_pence ?? 0
    const feePence = booking?.booking_fee_pence ?? 0

    async function handleAction(action: 'approve' | 'reject') {
        setLoading(true)
        setErrorMsg('')

        const res = await fetch('/api/organiser/refunds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refund_request_id: request.id,
                action,
                organiser_note: action === 'reject' ? organiserNote.trim() || undefined : undefined,
            }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            setErrorMsg(json.error || 'Something went wrong')
            return
        }

        if (action === 'approve') {
            setSuccessMsg('Approved — admin has been notified')
        } else {
            setSuccessMsg('Refund request rejected')
        }

        setTimeout(() => onRemove(request.id), 1500)
    }

    if (successMsg) {
        return (
            <div style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '20px', marginBottom: '12px', color: '#00E5A0', fontSize: '14px' }}>
                {successMsg}
            </div>
        )
    }

    return (
        <div style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0F0F8', marginBottom: '4px' }}>
                        {request.buyer?.full_name || 'Guest'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#8888AA', marginBottom: '8px' }}>{request.buyer?.email || '—'}</p>

                    <p style={{ fontSize: '13px', color: '#F0F0F8', fontWeight: 500 }}>{booking?.event?.title || 'Unknown Event'}</p>
                    <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '2px', fontFamily: 'monospace' }}>{booking?.booking_ref}</p>

                    {booking?.items && booking.items.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '4px' }}>
                            {booking.items.map(i => `${i.ticket_type?.name || 'Ticket'} × ${i.quantity}`).join(', ')}
                        </p>
                    )}
                </div>

                <div style={{ textAlign: 'right', minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Paid</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0F0F8' }}>{formatPence(totalPence)}</p>
                    <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refund Amount</p>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#00E5A0' }}>{formatPence(refundPence)}</p>
                    {feePence > 0 && (
                        <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '2px' }}>excl. {formatPence(feePence)} booking fee</p>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2A2A3A' }}>
                <p style={{ fontSize: '12px', color: '#8888AA', marginBottom: '2px' }}>Reason</p>
                <p style={{ fontSize: '13px', color: '#F0F0F8' }}>{request.reason}</p>
                {request.message && (
                    <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '4px', fontStyle: 'italic' }}>{request.message}</p>
                )}
                <p style={{ fontSize: '11px', color: '#555566', marginTop: '6px' }}>Requested {fmtDate(request.created_at)}</p>
            </div>

            {rejecting && (
                <div style={{ marginTop: '12px' }}>
                    <textarea
                        value={organiserNote}
                        onChange={(e) => setOrganiserNote(e.target.value)}
                        rows={2}
                        placeholder="Reason for rejection (optional)..."
                        style={{ width: '100%', background: '#0A0A0F', border: '1px solid #2A2A3A', color: '#F0F0F8', padding: '8px 12px', fontSize: '13px', borderRadius: '2px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                </div>
            )}

            {errorMsg && (
                <p style={{ fontSize: '12px', color: '#E63950', marginTop: '8px' }}>{errorMsg}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                {!rejecting ? (
                    <>
                        <button
                            onClick={() => handleAction('approve')}
                            disabled={loading}
                            style={{
                                background: 'transparent',
                                border: '1px solid #00E5A0',
                                color: '#00E5A0',
                                padding: '8px 20px',
                                borderRadius: '2px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#00E5A0'; (e.currentTarget as HTMLButtonElement).style.color = '#0A0A0F' } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#00E5A0' }}
                        >
                            {loading ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                            onClick={() => setRejecting(true)}
                            disabled={loading}
                            style={{
                                background: 'transparent',
                                border: '1px solid #E63950',
                                color: '#E63950',
                                padding: '8px 20px',
                                borderRadius: '2px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E63950'; (e.currentTarget as HTMLButtonElement).style.color = '#ffffff' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#E63950' }}
                        >
                            Reject
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={loading}
                            style={{
                                background: '#E63950',
                                border: '1px solid #E63950',
                                color: '#ffffff',
                                padding: '8px 20px',
                                borderRadius: '2px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                            }}
                        >
                            {loading ? 'Processing...' : 'Confirm Reject'}
                        </button>
                        <button
                            onClick={() => setRejecting(false)}
                            disabled={loading}
                            style={{
                                background: 'transparent',
                                border: '1px solid #2A2A3A',
                                color: '#8888AA',
                                padding: '8px 20px',
                                borderRadius: '2px',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export function RefundsClient({ requests }: { requests: RefundItem[] }) {
    const [items, setItems] = useState(requests)

    function removeItem(id: string) {
        setItems(prev => prev.filter(r => r.id !== id))
    }

    if (items.length === 0) {
        return (
            <p style={{ textAlign: 'center', color: '#8888AA' }}>No pending refund requests</p>
        )
    }

    return (
        <div>
            {items.map(r => (
                <RefundCard key={r.id} request={r} onRemove={removeItem} />
            ))}
        </div>
    )
}
