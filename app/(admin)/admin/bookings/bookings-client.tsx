'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { aggregateBookingItems } from '@/lib/booking-aggregation'

type BookingRow = {
    id: string; booking_ref: string; status: string; total_pence: number | null
    ticket_subtotal_pence: number | null; booking_fee_pence: number | null
    payment_method: string | null; created_at: string; confirmed_at: string | null
    user_id: string | null
    profiles: { full_name: string | null; email: string | null } | null
    event: { id: string; title: string; organiser_id: string } | null
}

interface EventOption { id: string; title: string; organiser_id: string }
interface OrganiserOption { id: string; org_name: string }

interface Props {
    bookings: BookingRow[]
    totalRows: number
    page: number
    pageSize: number
    events: EventOption[]
    organisers: OrganiserOption[]
}

interface BookingDetail {
    booking: {
        id: string
        booking_ref: string
        status: string
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        discount_pence: number | null
        total_pence: number | null
        payment_method: string | null
        stripe_payment_intent_id: string | null
        created_at: string
        confirmed_at: string | null
        user_id: string | null
        buyer: { full_name: string | null; email: string | null } | null
        event: {
            id: string
            title: string
            start_at: string
            venue_name: string | null
            venue_address: string | null
            organiser: { id: string; org_name: string } | null
        } | null
    }
    items: {
        id: string
        quantity: number
        unit_price_pence: number
        attendee_name: string | null
        attendee_email: string | null
        ticket_type_id?: string | null
        ticket_type: { name: string; is_group?: boolean | null; group_size?: number | null } | null
    }[]
    refundRequest: {
        id: string
        status: string
        reason: string | null
        message: string | null
        refund_amount_pence: number | null
        organiser_note: string | null
        admin_note: string | null
        created_at: string
        resolved_at: string | null
    } | null
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-gold bg-gold/10 border-gold/20',
    confirmed: 'text-success bg-success/10 border-success/20',
    cancelled: 'text-muted bg-muted/10 border-muted/20',
    refunded: 'text-accent bg-accent/10 border-accent/20',
}

const REFUND_STATUS_LABEL: Record<string, string> = {
    pending: 'Pending Organiser',
    organiser_approved: 'Awaiting Admin',
    organiser_rejected: 'Organiser Rejected',
    admin_approved: 'Refunded',
    admin_rejected: 'Denied by Admin',
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string) {
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

export function AdminBookingsClient({ bookings, totalRows, page, pageSize, events, organisers }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Local filter state — Apply pushes to URL.
    const [filterQ, setFilterQ] = useState(searchParams.get('q') ?? '')
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '')
    const [filterEventId, setFilterEventId] = useState(searchParams.get('event_id') ?? '')
    const [filterOrganiserId, setFilterOrganiserId] = useState(searchParams.get('organiser_id') ?? '')

    // Resync local state when URL changes (e.g. user hits browser back).
    useEffect(() => {
        setFilterQ(searchParams.get('q') ?? '')
        setFilterStatus(searchParams.get('status') ?? '')
        setFilterEventId(searchParams.get('event_id') ?? '')
        setFilterOrganiserId(searchParams.get('organiser_id') ?? '')
    }, [searchParams])

    // Narrow the event dropdown to the chosen organiser's events.
    const visibleEvents = useMemo(() => {
        if (!filterOrganiserId) return events
        return events.filter(e => e.organiser_id === filterOrganiserId)
    }, [events, filterOrganiserId])

    // If switching organiser invalidates the picked event, clear it.
    useEffect(() => {
        if (filterEventId && !visibleEvents.some(e => e.id === filterEventId)) {
            setFilterEventId('')
        }
    }, [visibleEvents, filterEventId])

    const hasActiveFilters = Boolean(filterQ || filterStatus || filterEventId || filterOrganiserId)

    const [detailId, setDetailId] = useState<string | null>(null)
    const [detail, setDetail] = useState<BookingDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState<string | null>(null)
    const [resendingId, setResendingId] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    function applyFilters() {
        const params = new URLSearchParams()
        if (filterQ.trim()) params.set('q', filterQ.trim())
        if (filterStatus) params.set('status', filterStatus)
        if (filterEventId) params.set('event_id', filterEventId)
        if (filterOrganiserId) params.set('organiser_id', filterOrganiserId)
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    function resetFilters() {
        setFilterQ('')
        setFilterStatus('')
        setFilterEventId('')
        setFilterOrganiserId('')
        router.push(pathname, { scroll: false })
    }

    function gotoPage(nextPage: number) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', String(nextPage))
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    useEffect(() => {
        if (!detailId) return
        let cancelled = false
        setDetail(null)
        setDetailError(null)
        setDetailLoading(true)
        fetch(`/api/admin/bookings/${detailId}`)
            .then(async res => {
                const json = await res.json().catch(() => ({}))
                if (cancelled) return
                if (!res.ok) {
                    setDetailError(json.error || 'Failed to load booking')
                } else {
                    setDetail(json)
                }
            })
            .finally(() => { if (!cancelled) setDetailLoading(false) })
        return () => { cancelled = true }
    }, [detailId])

    async function handleResendConfirmation(bookingId: string) {
        setResendingId(bookingId)
        const res = await fetch(`/api/admin/bookings/${bookingId}/resend-confirmation`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        setResendingId(null)
        if (res.ok) {
            showToast(json.sentTo ? `Confirmation sent to ${json.sentTo}` : 'Confirmation email sent')
        } else {
            showToast(`Resend failed: ${json.error || 'unknown error'}`)
        }
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">BOOKINGS</h1>
                <p className="text-muted text-sm mt-1">All ticket purchases. Refund requests are managed in the Refunds area.</p>
            </div>

            <form
                onSubmit={e => { e.preventDefault(); applyFilters() }}
                className="flex flex-wrap items-end gap-3 mb-6"
            >
                <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted">Search</label>
                    <input
                        type="search"
                        placeholder="Booking ref…"
                        value={filterQ}
                        onChange={e => setFilterQ(e.target.value)}
                        className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent w-56"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted">Status</label>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted">Organiser</label>
                    <select
                        value={filterOrganiserId}
                        onChange={e => setFilterOrganiserId(e.target.value)}
                        className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent max-w-[220px]"
                    >
                        <option value="">All organisers</option>
                        {organisers.map(o => (
                            <option key={o.id} value={o.id}>{o.org_name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted">Event</label>
                    <select
                        value={filterEventId}
                        onChange={e => setFilterEventId(e.target.value)}
                        className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent max-w-[260px]"
                    >
                        <option value="">All events</option>
                        {visibleEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    className="px-4 py-2 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                >
                    Apply
                </button>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-xs text-muted hover:text-text transition-colors"
                    >
                        Reset
                    </button>
                )}
            </form>

            <div className="bg-card border border-border rounded-none overflow-x-auto mb-4">
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
                                <td className="py-2.5 px-3">
                                    <button
                                        onClick={() => setDetailId(b.id)}
                                        className="font-mono text-xs text-accent hover:underline"
                                        title="View booking details"
                                    >
                                        {b.booking_ref}
                                    </button>
                                </td>
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
                                    <button
                                        onClick={() => handleResendConfirmation(b.id)}
                                        disabled={resendingId === b.id}
                                        className="text-xs text-muted hover:text-text disabled:opacity-50"
                                    >
                                        {resendingId === b.id ? 'Sending…' : 'Resend'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => gotoPage(page - 1)} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => gotoPage(page + 1)} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal */}
            {detailId && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setDetailId(null)}
                >
                    <div
                        className="bg-card border border-border rounded-none p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-heading text-2xl text-text tracking-wide">BOOKING DETAILS</h3>
                                {detail && (
                                    <p className="font-mono text-sm text-accent mt-1">{detail.booking.booking_ref}</p>
                                )}
                            </div>
                            <button onClick={() => setDetailId(null)} className="text-muted hover:text-text text-xl leading-none">×</button>
                        </div>

                        {detailLoading && <p className="text-muted text-sm py-8 text-center">Loading…</p>}
                        {detailError && <p className="text-accent text-sm py-8 text-center">{detailError}</p>}

                        {detail && (
                            <div className="flex flex-col gap-5 text-sm">
                                {/* Status + Date */}
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[detail.booking.status] || STATUS_BADGE.pending}`}>
                                        {detail.booking.status}
                                    </span>
                                    <span className="text-xs text-muted">Created {fmtDateTime(detail.booking.created_at)}</span>
                                    {detail.booking.confirmed_at && (
                                        <span className="text-xs text-muted">· Confirmed {fmtDateTime(detail.booking.confirmed_at)}</span>
                                    )}
                                </div>

                                {/* Buyer */}
                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Buyer</h4>
                                    <p className="text-text">{detail.booking.buyer?.full_name || '—'}</p>
                                    <p className="text-muted text-xs">{detail.booking.buyer?.email || '—'}</p>
                                </section>

                                {/* Event */}
                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Event</h4>
                                    <p className="text-text">{detail.booking.event?.title || '—'}</p>
                                    {detail.booking.event && (
                                        <p className="text-muted text-xs mt-0.5">{fmtDateTime(detail.booking.event.start_at)}</p>
                                    )}
                                    {detail.booking.event?.venue_name && (
                                        <p className="text-muted text-xs">{detail.booking.event.venue_name}{detail.booking.event.venue_address ? `, ${detail.booking.event.venue_address}` : ''}</p>
                                    )}
                                    {detail.booking.event?.organiser && (
                                        <p className="text-muted text-xs mt-1">Organiser: {detail.booking.event.organiser.org_name}</p>
                                    )}
                                </section>

                                {/* Tickets */}
                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Tickets</h4>
                                    <div className="bg-surface border border-border">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-2 px-3 text-muted font-normal">Type</th>
                                                    <th className="text-left py-2 px-3 text-muted font-normal">Attendee</th>
                                                    <th className="text-right py-2 px-3 text-muted font-normal">Qty</th>
                                                    <th className="text-right py-2 px-3 text-muted font-normal">Unit</th>
                                                    <th className="text-right py-2 px-3 text-muted font-normal">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detail.items.length === 0 && (
                                                    <tr><td colSpan={5} className="py-3 px-3 text-center text-muted">No items</td></tr>
                                                )}
                                                {aggregateBookingItems(detail.items).map(row => {
                                                    const buyerEmail = detail.items.find(it => it.ticket_type_id === row.key && it.attendee_email)?.attendee_email
                                                        ?? detail.items[0]?.attendee_email
                                                    return (
                                                        <tr key={row.key} className="border-b border-border/50 last:border-0">
                                                            <td className="py-2 px-3 text-text">
                                                                {row.name}
                                                                {row.is_group && row.group_size > 1 && (
                                                                    <span className="block text-[10px] text-muted">Admits {row.group_size}/ticket</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3 text-muted">
                                                                {row.attendee_name || '—'}
                                                                {buyerEmail && <span className="block text-[10px]">{buyerEmail}</span>}
                                                            </td>
                                                            <td className="py-2 px-3 text-right text-text">{row.quantity}</td>
                                                            <td className="py-2 px-3 text-right text-muted">{formatPence(row.unit_price_pence)}</td>
                                                            <td className="py-2 px-3 text-right text-text">{formatPence(row.subtotal_pence)}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* Totals */}
                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Payment</h4>
                                    <div className="flex flex-col gap-1 text-xs">
                                        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-text">{formatPence(detail.booking.ticket_subtotal_pence || 0)}</span></div>
                                        {(detail.booking.discount_pence ?? 0) > 0 && (
                                            <div className="flex justify-between"><span className="text-success">Discount</span><span className="text-success">-{formatPence(detail.booking.discount_pence || 0)}</span></div>
                                        )}
                                        <div className="flex justify-between"><span className="text-muted">Booking fee</span><span className="text-text">{formatPence(detail.booking.booking_fee_pence || 0)}</span></div>
                                        <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-text font-medium">Total</span><span className="text-text font-medium">{formatPence(detail.booking.total_pence || 0)}</span></div>
                                        <div className="flex justify-between mt-2"><span className="text-muted">Method</span><span className="text-text">{detail.booking.payment_method || '—'}</span></div>
                                        {detail.booking.stripe_payment_intent_id && (
                                            <div className="flex justify-between"><span className="text-muted">Stripe PI</span><span className="text-text font-mono text-[10px] break-all">{detail.booking.stripe_payment_intent_id}</span></div>
                                        )}
                                    </div>
                                </section>

                                {/* Refund request */}
                                {detail.refundRequest && (
                                    <section>
                                        <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Refund Request</h4>
                                        <div className="bg-surface border border-border p-3 text-xs">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-text">{REFUND_STATUS_LABEL[detail.refundRequest.status] || detail.refundRequest.status}</span>
                                                <span className="text-muted">{fmtDateTime(detail.refundRequest.created_at)}</span>
                                            </div>
                                            {detail.refundRequest.reason && <p className="text-muted mt-1"><span className="text-text">Reason:</span> {detail.refundRequest.reason}</p>}
                                            {detail.refundRequest.message && <p className="text-muted mt-1"><span className="text-text">Message:</span> {detail.refundRequest.message}</p>}
                                            {detail.refundRequest.organiser_note && <p className="text-muted mt-1"><span className="text-text">Organiser note:</span> {detail.refundRequest.organiser_note}</p>}
                                            {detail.refundRequest.admin_note && <p className="text-muted mt-1"><span className="text-text">Admin note:</span> {detail.refundRequest.admin_note}</p>}
                                            <div className="mt-2">
                                                <a href="/admin/refunds" className="text-accent hover:underline">Manage in Refunds →</a>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2 border-t border-border">
                                    <button
                                        onClick={() => handleResendConfirmation(detail.booking.id)}
                                        disabled={resendingId === detail.booking.id}
                                        className="text-sm text-accent hover:underline disabled:opacity-50"
                                    >
                                        {resendingId === detail.booking.id ? 'Sending…' : 'Resend confirmation email'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
