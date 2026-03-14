'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

type Tab = 'all' | 'refunds'

type BookingRow = {
    id: string; booking_ref: string; status: string; total_pence: number | null
    ticket_subtotal_pence: number | null; booking_fee_pence: number | null
    payment_method: string | null; created_at: string; confirmed_at: string | null
    user_id: string | null
    profiles: { full_name: string | null; email: string | null } | null
    event: { title: string } | null
}

type RefundRow = {
    id: string; status: string; reason: string; message: string | null; created_at: string
    booking: {
        id: string; booking_ref: string; total_pence: number | null; user_id: string | null
        profiles: { full_name: string | null; email: string | null } | null
        event: { title: string } | null
    } | null
}

interface Props {
    bookings: BookingRow[]
    refunds: RefundRow[]
    totalRows: number
    page: number
    pageSize: number
    tab: Tab
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-gold bg-gold/10 border-gold/20',
    confirmed: 'text-success bg-success/10 border-success/20',
    cancelled: 'text-muted bg-muted/10 border-muted/20',
    refunded: 'text-accent bg-accent/10 border-accent/20',
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function AdminBookingsClient({ bookings, refunds, totalRows, page, pageSize, tab }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [refundModal, setRefundModal] = useState<{ booking: BookingRow; type: 'full' | 'partial' } | null>(null)
    const [partialAmount, setPartialAmount] = useState('')
    const [forceApproveModal, setForceApproveModal] = useState<RefundRow | null>(null)
    const [forceRejectModal, setForceRejectModal] = useState<RefundRow | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
    }

    function switchTab(t: Tab) {
        updateParam('tab', t === 'all' ? '' : t)
    }

    async function handleRefund(type: 'full' | 'partial', booking: BookingRow) {
        setLoading(true)
        const body: { booking_id: string; type: string; amount_pence?: number } = { booking_id: booking.id, type }
        if (type === 'partial') {
            body.amount_pence = Math.round(parseFloat(partialAmount) * 100)
        }
        const res = await fetch('/api/admin/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        setLoading(false)
        if (res.ok) {
            showToast('Refund issued')
            setRefundModal(null)
            router.refresh()
        }
    }

    async function handleForceApprove(refund: RefundRow) {
        if (!refund.booking) return
        setLoading(true)
        await fetch('/api/admin/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: refund.booking.id, type: 'full', refund_request_id: refund.id }),
        })
        setLoading(false)
        showToast('Refund approved')
        setForceApproveModal(null)
        router.refresh()
    }

    async function handleForceReject() {
        if (!forceRejectModal || !rejectReason.trim()) return
        setLoading(true)
        await fetch(`/api/admin/refund-requests/${forceRejectModal.id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectReason }),
        })
        setLoading(false)
        showToast('Refund request rejected')
        setForceRejectModal(null)
        router.refresh()
    }

    async function handleResendConfirmation(bookingId: string) {
        await fetch(`/api/admin/bookings/${bookingId}/resend-confirmation`, { method: 'POST' })
        showToast('Confirmation email sent')
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-lg text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">BOOKINGS</h1>
                <p className="text-muted text-sm mt-1">Manage bookings and refunds</p>
            </div>

            <div className="flex gap-1 mb-6 border-b border-border">
                {(['all', 'refunds'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => switchTab(t)}
                        className={`px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 capitalize ${tab === t ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t === 'refunds' ? 'Pending Refunds' : 'All Bookings'}
                    </button>
                ))}
            </div>

            {/* All Bookings Tab */}
            {tab === 'all' && (
                <>
                    <div className="flex gap-3 mb-6">
                        <input
                            type="search"
                            placeholder="Search by ref..."
                            defaultValue={searchParams.get('q') ?? ''}
                            onChange={e => {
                                const v = e.target.value
                                clearTimeout((window as Window & { _bt?: ReturnType<typeof setTimeout> })._bt)
                                ;(window as Window & { _bt?: ReturnType<typeof setTimeout> })._bt = setTimeout(() => updateParam('q', v), 300)
                            }}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent w-56"
                        />
                        <select
                            defaultValue={searchParams.get('status') ?? ''}
                            onChange={e => updateParam('status', e.target.value)}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Ref', 'Buyer', 'Event', 'Subtotal', 'Fee', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map(h => (
                                        <th key={h} className="text-left text-xs text-muted py-3 px-3 font-normal">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.length === 0 && (
                                    <tr><td colSpan={10} className="text-center text-muted text-xs py-12">No bookings found</td></tr>
                                )}
                                {bookings.map(b => (
                                    <tr key={b.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                        <td className="py-2.5 px-3"><span className="font-mono text-xs text-accent">{b.booking_ref}</span></td>
                                        <td className="py-2.5 px-3 text-xs text-text">{b.profiles?.full_name ?? '—'}</td>
                                        <td className="py-2.5 px-3 text-xs text-muted max-w-[120px] truncate">{b.event?.title ?? '—'}</td>
                                        <td className="py-2.5 px-3 text-xs text-text">{formatPence(b.ticket_subtotal_pence || 0)}</td>
                                        <td className="py-2.5 px-3 text-xs text-muted">{formatPence(b.booking_fee_pence || 0)}</td>
                                        <td className="py-2.5 px-3 text-xs text-text font-medium">{formatPence(b.total_pence || 0)}</td>
                                        <td className="py-2.5 px-3 text-xs text-muted">{b.payment_method ?? '—'}</td>
                                        <td className="py-2.5 px-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[b.status] || STATUS_BADGE.pending}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-muted whitespace-nowrap">{fmt(b.created_at)}</td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                                <button onClick={() => handleResendConfirmation(b.id)} className="text-muted hover:text-text">Resend</button>
                                                {b.status === 'confirmed' && (
                                                    <>
                                                        <span className="text-border">·</span>
                                                        <button onClick={() => setRefundModal({ booking: b, type: 'full' })} className="text-accent hover:underline">Refund</button>
                                                        <span className="text-border">·</span>
                                                        <button onClick={() => { setRefundModal({ booking: b, type: 'partial' }); setPartialAmount('') }} className="text-gold hover:underline">Partial</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Pending Refunds Tab */}
            {tab === 'refunds' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Booking Ref', 'Buyer', 'Event', 'Amount', 'Reason', 'Requested', 'Actions'].map(h => (
                                    <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {refunds.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted text-xs py-12">No pending refund requests</td></tr>
                            )}
                            {refunds.map(r => (
                                <tr key={r.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-3 px-4"><span className="font-mono text-xs text-accent">{r.booking?.booking_ref ?? '—'}</span></td>
                                    <td className="py-3 px-4 text-xs text-text">{r.booking?.profiles?.full_name ?? '—'}</td>
                                    <td className="py-3 px-4 text-xs text-muted max-w-[120px] truncate">{r.booking?.event?.title ?? '—'}</td>
                                    <td className="py-3 px-4 text-xs text-text">{formatPence(r.booking?.total_pence || 0)}</td>
                                    <td className="py-3 px-4 text-xs text-muted max-w-[120px] truncate">{r.reason}</td>
                                    <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{fmt(r.created_at)}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 text-xs">
                                            <button onClick={() => setForceApproveModal(r)} className="text-success hover:underline">Force Approve</button>
                                            <span className="text-border">·</span>
                                            <button onClick={() => { setForceRejectModal(r); setRejectReason('') }} className="text-accent hover:underline">Force Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                </div>
            )}

            {/* Full/Partial Refund Modal */}
            {refundModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">
                            {refundModal.type === 'full' ? 'Issue Full Refund' : 'Issue Partial Refund'}
                        </h3>
                        <p className="text-sm text-muted mb-2">{refundModal.booking.booking_ref}</p>
                        <p className="text-sm text-text mb-4">Total paid: {formatPence(refundModal.booking.total_pence || 0)}</p>
                        {refundModal.type === 'partial' && (
                            <div className="mb-4">
                                <label className="text-xs text-muted block mb-1">Refund amount (£)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={((refundModal.booking.total_pence || 0) / 100).toFixed(2)}
                                    value={partialAmount}
                                    onChange={e => setPartialAmount(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                />
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button
                                variant="danger"
                                size="md"
                                onClick={() => handleRefund(refundModal.type, refundModal.booking)}
                                disabled={loading || (refundModal.type === 'partial' && !partialAmount)}
                            >
                                {loading ? 'Processing...' : 'Issue Refund'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setRefundModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Force Approve Modal */}
            {forceApproveModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Force Approve Refund</h3>
                        <p className="text-sm text-muted mb-2">{forceApproveModal.booking?.booking_ref}</p>
                        <p className="text-sm text-text mb-4">This will immediately issue a Stripe refund of {formatPence(forceApproveModal.booking?.total_pence || 0)}.</p>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={() => handleForceApprove(forceApproveModal)} disabled={loading}>
                                {loading ? 'Processing...' : 'Approve & Refund'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setForceApproveModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Force Reject Modal */}
            {forceRejectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Force Reject Refund</h3>
                        <p className="text-sm text-muted mb-4">{forceRejectModal.booking?.booking_ref}</p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Admin reason for rejection (required)"
                            rows={3}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleForceReject} disabled={loading || !rejectReason.trim()}>
                                {loading ? 'Rejecting...' : 'Reject Request'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setForceRejectModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
