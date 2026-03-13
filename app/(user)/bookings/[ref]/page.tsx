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
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address, banner_url), items:booking_items(*, ticket_type:ticket_types(name))')
        .eq('booking_ref', params.ref)
        .eq('user_id', user.id)
        .single()

    if (!bookingRaw) {
        notFound()
    }

    const booking = bookingRaw as Booking

    // Check if refund request exists
    const { data: existingRefund } = await supabase
        .from('refund_requests')
        .select('id, status')
        .eq('booking_id', booking.id)
        .neq('status', 'rejected')
        .limit(1)
        .single()

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

    // Can request refund if confirmed, event > 48h away, no pending/approved refund
    const canRefund =
        booking.status === 'confirmed' &&
        event &&
        new Date(event.start_at).getTime() > Date.now() + 48 * 60 * 60 * 1000 &&
        !existingRefund

    const qrCode = booking.items?.[0]?.qr_code || booking.booking_ref

    return (
        <section className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="font-heading text-4xl text-text">{event?.title || 'Booking'}</h1>
                <p className="text-muted">{eventDate} · {eventTime}</p>
                <p className="text-muted">{event?.venue_name}, {event?.venue_address}</p>
            </div>

            {/* QR Code */}
            <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-4">
                <BookingQR value={qrCode} />
                <p className="text-sm text-muted">Show this at the door</p>
                <p className="font-mono text-2xl font-bold text-accent">{booking.booking_ref}</p>
            </div>

            {/* Ticket breakdown */}
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
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
            <div className="flex flex-col sm:flex-row gap-3">
                <a
                    href={`/api/tickets/${booking.booking_ref}/pdf`}
                    target="_blank"
                    className="h-11 px-6 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition flex items-center justify-center"
                >
                    Download PDF Ticket
                </a>

                {canRefund && (
                    <RefundButton bookingId={booking.id} />
                )}

                {existingRefund && (
                    <div className="h-11 px-6 rounded-lg border border-gold/30 bg-gold/10 text-gold text-sm font-medium flex items-center justify-center">
                        Refund {existingRefund.status}
                    </div>
                )}
            </div>
        </section>
    )
}
