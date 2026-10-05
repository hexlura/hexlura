import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatPence, allocateFee } from '@/lib/fees'
import { Booking } from '@/types'
import { aggregateBookingItems, type RawBookingItem } from '@/lib/booking-aggregation'
import { isRefundWindowOpen } from '@/lib/refund-policy'
import Link from 'next/link'
import RefundButton from './refund-button'

export default async function BookingDetailPage({ params }: { params: { ref: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: bookingRaw } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address, banner_url, refund_policy), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))')
        .eq('booking_ref', params.ref)
        .eq('user_id', user.id)
        .single()

    if (!bookingRaw) {
        notFound()
    }

    const booking = bookingRaw as Booking

    // Check if refund request exists (all statuses)
    const { data: existingRefund } = await supabase
        .from('refund_requests')
        .select('id, status, refund_amount_pence')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const event = booking.event
    const eventDate = event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(event.start_at))
        : ''
    const eventTime = event
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(event.start_at))
        : ''

    const bookingFee = booking.booking_fee_pence || 0
    // Buyers see one combined fee figure, never the booking/processing split
    const totalFee = bookingFee + (booking.order_processing_fee_pence || 0)
    const discount = booking.discount_pence || 0
    const total = booking.total_pence || 0

    const confirmedDate = booking.confirmed_at
        ? new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(new Date(booking.confirmed_at))
        : ''

    // Only block refund if there's an active (pending/approved) request — rejected ones allow re-request
    const activeRefund = existingRefund &&
        (existingRefund.status === 'pending' || existingRefund.status === 'organiser_approved')

    const hoursUntilEvent = event
        ? (new Date(event.start_at).getTime() - Date.now()) / (1000 * 60 * 60)
        : 0
    const refundPolicy = event?.refund_policy

    const canRefund =
        booking.status === 'confirmed' &&
        event &&
        hoursUntilEvent > 0 &&
        isRefundWindowOpen(refundPolicy, hoursUntilEvent) &&
        !activeRefund

    type ExtendedItem = { quantity: number; ticket_type?: { is_group?: boolean; group_size?: number } | null }
    const totalTickets = ((bookingRaw?.items ?? []) as unknown as ExtendedItem[]).reduce((sum, item) => {
        if (item.ticket_type?.is_group) return sum + (item.ticket_type.group_size ?? 1)
        return sum + item.quantity
    }, 0)

    // Collapse group-ticket member rows into a single line per ticket type.
    const displayItems = aggregateBookingItems((bookingRaw?.items ?? []) as unknown as RawBookingItem[])
    // Each line shows its all-in price (ticket + its share of all fees)
    const lineFees = allocateFee(displayItems.map(r => r.subtotal_pence), totalFee)

    const statusChip: Record<string, string> = {
        confirmed: 'bg-warm-green/15 text-warm-green',
        cancelled: 'bg-warm-red/10 text-warm-red',
        refunded: 'bg-warm-amber/15 text-warm-amberText',
    }
    const downloadBtn = 'px-4 py-2 rounded-full bg-text text-white text-xs font-semibold hover:bg-black transition whitespace-nowrap'

    return (
        <section className="max-w-3xl mx-auto">
            <Link href="/bookings" className="text-sm text-muted hover:text-accent mb-2 inline-block">← Back to Bookings</Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div className="min-w-0">
                    <p className="text-xs font-mono text-muted mb-1">{booking.booking_ref}</p>
                    <h1 className="font-heading text-3xl tracking-wide">{event?.title || 'Booking'}</h1>
                    <p className="text-sm text-muted mt-1">
                        {[event?.venue_name, event?.venue_address].filter(Boolean).join(', ')}
                        {eventDate && ` · ${eventDate}, ${eventTime}`}
                    </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${statusChip[booking.status] || 'bg-border text-muted'}`}>
                    {booking.status}
                </span>
            </div>

            {/* Refund status banner */}
            {existingRefund && existingRefund.status === 'pending' && (
                <RefundBanner tone="amber">Refund requested — your request is being reviewed by the organiser.</RefundBanner>
            )}
            {existingRefund && existingRefund.status === 'organiser_approved' && (
                <RefundBanner tone="amber">Under review — the organiser approved your refund and it is awaiting final confirmation.</RefundBanner>
            )}
            {existingRefund && existingRefund.status === 'admin_approved' && (
                <RefundBanner tone="green">
                    Refunded — your refund of £{((existingRefund.refund_amount_pence ?? 0) / 100).toFixed(2)} has been processed. Allow 5–10 business days to appear.
                </RefundBanner>
            )}
            {existingRefund && (existingRefund.status === 'organiser_rejected' || existingRefund.status === 'admin_rejected') && (
                <RefundBanner tone="red">
                    Refund declined — if you believe this is an error, email <span className="font-semibold">support@hexlura.com</span> with your booking reference:{' '}
                    <span className="font-mono">{booking.booking_ref}</span>
                </RefundBanner>
            )}

            {/* Ticket breakdown */}
            <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-5">
                <h2 className="font-heading text-lg tracking-wide mb-4">TICKET BREAKDOWN</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted border-b border-border">
                            <th className="pb-2 font-semibold">Ticket</th>
                            <th className="pb-2 font-semibold text-center">Qty</th>
                            <th className="pb-2 font-semibold text-right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayItems.map((row, i) => (
                            <tr key={row.key} className="border-b border-border">
                                <td className="py-3">
                                    {row.name}
                                    {row.is_group && row.group_size > 1 && (
                                        <span className="block text-xs text-muted">Admits {row.group_size} per ticket</span>
                                    )}
                                </td>
                                <td className="py-3 text-center">{row.quantity}</td>
                                <td className="py-3 text-right font-semibold">{formatPence(row.subtotal_pence + lineFees[i])}</td>
                            </tr>
                        ))}
                        {discount > 0 && (
                            <tr className="border-b border-border">
                                <td colSpan={2} className="py-3 text-success">Promo discount</td>
                                <td className="py-3 text-right text-success">-{formatPence(discount)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="mt-4 flex justify-between items-baseline font-semibold text-base">
                    <span>Total Paid</span>
                    <span className="font-heading text-xl">{formatPence(total)}</span>
                </div>
                {totalFee > 0 && (
                    <p className="text-right text-xs text-muted mt-1">incl. {formatPence(totalFee)} fee</p>
                )}
                {(booking.payment_method || confirmedDate) && (
                    <p className="text-xs text-muted mt-3">
                        {booking.payment_method && <>Paid via {booking.payment_method}</>}
                        {booking.payment_method && confirmedDate && ' · '}
                        {confirmedDate && <>Confirmed {confirmedDate}</>}
                    </p>
                )}
            </div>

            {/* Tickets */}
            <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-5">
                <h2 className="font-heading text-lg tracking-wide mb-4">YOUR TICKETS</h2>
                <div className="space-y-3">
                    {totalTickets <= 1 ? (
                        <div className="flex items-center justify-between gap-3 border border-border rounded-xl p-3.5">
                            <div>
                                <p className="text-sm font-semibold">Ticket</p>
                                <p className="text-xs text-muted font-mono">{booking.booking_ref}</p>
                            </div>
                            <a href={`/api/tickets/${booking.booking_ref}/pdf`} target="_blank" className={downloadBtn}>
                                Download PDF
                            </a>
                        </div>
                    ) : (
                        Array.from({ length: totalTickets }, (_, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 border border-border rounded-xl p-3.5">
                                <div>
                                    <p className="text-sm font-semibold">Ticket {i + 1}</p>
                                    <p className="text-xs text-muted font-mono">{booking.booking_ref}</p>
                                </div>
                                <a href={`/api/tickets/${booking.booking_ref}/pdf?index=${i + 1}`} target="_blank" className={downloadBtn}>
                                    Download PDF
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Refund request */}
            {canRefund && (
                <div className="bg-card rounded-2xl border border-border shadow-soft p-6 flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <p className="font-semibold text-sm">Need a refund?</p>
                        {refundPolicy && <p className="text-xs text-muted">{refundPolicy}</p>}
                    </div>
                    <div className="sm:text-right">
                        <RefundButton bookingId={booking.id} />
                    </div>
                </div>
            )}
        </section>
    )
}

function RefundBanner({ tone, children }: { tone: 'amber' | 'green' | 'red'; children: React.ReactNode }) {
    const styles = {
        amber: 'bg-warm-amber/10 border-warm-amber/30 text-warm-amberText',
        green: 'bg-warm-green/10 border-warm-green/30 text-warm-green',
        red: 'bg-warm-red/10 border-warm-red/30 text-warm-red',
    }
    return (
        <div className={`mb-6 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[tone]}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            <div>{children}</div>
        </div>
    )
}
