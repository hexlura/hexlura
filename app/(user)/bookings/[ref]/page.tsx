import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { Booking } from '@/types'
import BookingQR from './booking-qr'
import RefundButton from './refund-button'

export default async function BookingDetailPage({ params }: { params: { ref: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: bookingRaw } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address, banner_url), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))')
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
    // Can request refund if confirmed, event > 48h away, no active refund
    const canRefund =
        booking.status === 'confirmed' &&
        event &&
        new Date(event.start_at).getTime() > Date.now() + 48 * 60 * 60 * 1000 &&
        !activeRefund

    const qrCode = booking.items?.[0]?.qr_code || booking.booking_ref

    type ExtendedItem = { quantity: number; ticket_type?: { is_group?: boolean; group_size?: number } | null }
    const totalTickets = ((bookingRaw?.items ?? []) as unknown as ExtendedItem[]).reduce((sum, item) => {
        if (item.ticket_type?.is_group) return sum + (item.ticket_type.group_size ?? 1)
        return sum + item.quantity
    }, 0)

    return (
        <section className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="font-heading text-4xl text-text">{event?.title || 'Booking'}</h1>
                <p className="text-muted">{eventDate} · {eventTime}</p>
                <p className="text-muted">{event?.venue_name}, {event?.venue_address}</p>
            </div>

            {/* QR Code */}
            <div className="bg-surface border border-border rounded-none p-8 text-center space-y-4">
                <BookingQR value={qrCode} />
                <p className="text-sm text-muted">Show this at the door</p>
                <p className="font-mono text-2xl font-bold text-accent">{booking.booking_ref}</p>
            </div>

            {/* Ticket breakdown */}
            <div className="bg-surface border border-border rounded-none p-6 space-y-4">
                <h3 className="font-bold text-text text-lg">Ticket Breakdown</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-muted text-left">
                            <th className="pb-2">Ticket</th>
                            <th className="pb-2 text-center">Qty</th>
                            <th className="pb-2 text-right">Unit Price</th>
                            <th className="pb-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {booking.items?.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-3 text-text">{item.ticket_type?.name || 'Ticket'}</td>
                                <td className="py-3 text-center text-text">{item.quantity}</td>
                                <td className="py-3 text-right text-text">{formatPence(item.unit_price_pence)}</td>
                                <td className="py-3 text-right text-text">{formatPence(item.unit_price_pence * item.quantity)}</td>
                            </tr>
                        ))}
                        {discount > 0 && (
                            <tr className="border-b border-border/50">
                                <td colSpan={3} className="py-3 text-success">Promo discount</td>
                                <td className="py-3 text-right text-success">-{formatPence(discount)}</td>
                            </tr>
                        )}
                        <tr className="border-b border-border/50">
                            <td colSpan={3} className="py-3 text-muted">Hexlura booking fee</td>
                            <td className="py-3 text-right text-muted">{formatPence(bookingFee)}</td>
                        </tr>
                        <tr>
                            <td colSpan={3} className="py-3 font-bold text-text text-lg">Total</td>
                            <td className="py-3 text-right font-bold text-text text-lg">{formatPence(total)}</td>
                        </tr>
                    </tbody>
                </table>

                {booking.payment_method && (
                    <p className="text-sm text-muted">Paid via {booking.payment_method}</p>
                )}
                {confirmedDate && (
                    <p className="text-sm text-muted">Confirmed {confirmedDate}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                {totalTickets <= 1 ? (
                    <a
                        href={`/api/tickets/${booking.booking_ref}/pdf`}
                        target="_blank"
                        className="h-11 px-6 rounded-sm bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition flex items-center justify-center"
                    >
                        Download PDF Ticket
                    </a>
                ) : (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: totalTickets }, (_, i) => (
                            <a
                                key={i}
                                href={`/api/tickets/${booking.booking_ref}/pdf?index=${i + 1}`}
                                target="_blank"
                                style={{ border: '1px solid #2A2A3A', color: '#F0F0F8', padding: '8px 16px', borderRadius: 2, fontSize: 13, textAlign: 'center', display: 'block', textDecoration: 'none' }}
                            >
                                Download Ticket {i + 1}
                            </a>
                        ))}
                    </div>
                )}

                {canRefund && (
                    <RefundButton bookingId={booking.id} />
                )}

                {existingRefund && existingRefund.status === 'pending' && (
                    <div>
                        <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.1)', border: '1px solid #F5A623', color: '#F5A623', padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '2px', marginBottom: '8px' }}>
                            Refund Requested
                        </div>
                        <p style={{ fontSize: '13px', color: '#8888AA' }}>Your request is being reviewed by the organiser.</p>
                    </div>
                )}
                {existingRefund && existingRefund.status === 'organiser_approved' && (
                    <div>
                        <div style={{ display: 'inline-block', background: 'rgba(0,100,255,0.1)', border: '1px solid #6B9FFF', color: '#6B9FFF', padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '2px', marginBottom: '8px' }}>
                            Under Review
                        </div>
                        <p style={{ fontSize: '13px', color: '#8888AA' }}>Your refund has been approved by the organiser and is awaiting final confirmation.</p>
                    </div>
                )}
                {existingRefund && existingRefund.status === 'admin_approved' && (
                    <div>
                        <div style={{ display: 'inline-block', background: 'rgba(0,229,160,0.1)', border: '1px solid #00E5A0', color: '#00E5A0', padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '2px', marginBottom: '8px' }}>
                            Refunded
                        </div>
                        <p style={{ fontSize: '13px', color: '#8888AA' }}>
                            Your refund of £{((existingRefund.refund_amount_pence ?? 0) / 100).toFixed(2)} has been processed. Allow 5–10 business days to appear.
                        </p>
                    </div>
                )}
                {existingRefund && (existingRefund.status === 'organiser_rejected' || existingRefund.status === 'admin_rejected') && (
                    <div>
                        <div style={{ display: 'inline-block', background: 'rgba(230,57,80,0.1)', border: '1px solid #E63950', color: '#E63950', padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '2px', marginBottom: '8px' }}>
                            Refund Declined
                        </div>
                        <p style={{ fontSize: '13px', color: '#8888AA' }}>
                            Your refund request could not be approved. If you believe this is an error, email{' '}
                            <span style={{ color: '#F0F0F8' }}>support@hexlura.com</span> with your booking reference:{' '}
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', color: '#E63950' }}>{booking.booking_ref}</span>
                        </p>
                    </div>
                )}
            </div>
        </section>
    )
}
