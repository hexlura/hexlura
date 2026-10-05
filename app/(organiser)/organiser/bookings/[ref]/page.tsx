import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { aggregateBookingItems } from '@/lib/booking-aggregation'

interface PageProps {
    params: { ref: string }
}

const STATUS_PILL: Record<string, string> = {
    confirmed: 'text-warm-green bg-warm-green/10',
    pending: 'text-warm-yellowText bg-warm-yellow/10',
    cancelled: 'text-warm-red bg-warm-red/10',
    refunded: 'text-muted bg-border',
}

const BackLink = () => (
    <Link href="/organiser/bookings" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
        Back to Bookings
    </Link>
)

export default async function BookingDetailPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    // Security: only fetch the booking if it belongs to one of this organiser's events
    const { data: events, error: eventsErr } = await adminClient
        .from('events').select('id').eq('organiser_id', organiserId)
    if (eventsErr) throw eventsErr
    const eventIds = (events || []).map(e => e.id)

    const notFoundUI = (
        <div className="max-w-7xl">
            <BackLink />
            <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                <p className="text-base font-semibold mb-2">Booking not found</p>
                <p className="text-sm text-muted">This booking reference does not exist or does not belong to your organisation.</p>
            </div>
        </div>
    )

    if (!eventIds.length) return notFoundUI

    const { data: bookingRaw, error: bookingErr } = await adminClient
        .from('bookings')
        .select('id, booking_ref, status, is_complimentary, ticket_subtotal_pence, discount_pence, created_at, confirmed_at, user_id, event:events(id, title, start_at, venue_city)')
        .eq('booking_ref', params.ref)
        .in('event_id', eventIds)
        .maybeSingle()
    if (bookingErr) throw bookingErr
    if (!bookingRaw) return notFoundUI

    const booking = bookingRaw as unknown as {
        id: string
        booking_ref: string
        status: string
        is_complimentary: boolean | null
        ticket_subtotal_pence: number | null
        discount_pence: number | null
        created_at: string
        confirmed_at: string | null
        user_id: string | null
        event: { id: string; title: string; start_at: string; venue_city: string | null } | null
    }

    // Buyer profile (name + phone from profiles; email from auth)
    const { data: profile } = booking.user_id
        ? await adminClient
            .from('profiles')
            .select('full_name, phone')
            .eq('id', booking.user_id)
            .maybeSingle()
        : { data: null }

    let buyerEmail = ''
    if (booking.user_id) {
        const { data: { user: buyerUser } } = await adminClient.auth.admin.getUserById(booking.user_id)
        buyerEmail = buyerUser?.email || ''
    }

    // Booking items (group tickets are stored as one row per member)
    const { data: itemsRaw, error: itemsErr } = await adminClient
        .from('booking_items')
        .select('id, quantity, unit_price_pence, attendee_name, attendee_email, ticket_type_id, ticket_type:ticket_types(name, is_group, group_size)')
        .eq('booking_id', booking.id)
    if (itemsErr) throw itemsErr

    const items = (itemsRaw || []) as unknown as {
        id: string
        quantity: number
        unit_price_pence: number | null
        attendee_name: string | null
        attendee_email: string | null
        ticket_type_id: string | null
        ticket_type: { name: string; is_group?: boolean | null; group_size?: number | null } | null
    }[]

    // Collapse group-ticket member rows into a single line per ticket type.
    const displayItems = aggregateBookingItems(items)

    // Prefer auth email, fall back to attendee_email on the first raw item
    const displayEmail = buyerEmail || items[0]?.attendee_email || ''

    const eventDate = booking.event?.start_at
        ? new Date(booking.event.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
        : '—'

    const bookedDate = new Date(booking.created_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
    })

    // Ticket revenue only — what the organiser earns, after any promo-code discount
    const subtotalPence = booking.ticket_subtotal_pence || 0
    const discountPence = booking.discount_pence || 0
    const earningsPence = subtotalPence - discountPence

    const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
    const labelClass = 'text-xs text-muted uppercase tracking-wider'

    return (
        <div className="max-w-7xl">
            <BackLink />

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <p className={`${labelClass} mb-1`}>Booking Reference</p>
                    <h1 className="font-heading text-5xl tracking-wide">{booking.booking_ref}</h1>
                </div>
                <div className="flex items-center gap-2 pt-2">
                    {booking.is_complimentary && (
                        <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-3 py-1.5 rounded-full">Complimentary</span>
                    )}
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_PILL[booking.status] || 'text-muted bg-border'}`}>
                        {statusLabel}
                    </span>
                    <a
                        href={`/api/tickets/${booking.booking_ref}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-text text-white px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                        ↓ Download Tickets
                    </a>
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {/* Event */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className={`${labelClass} mb-2`}>Event</p>
                    <p className="text-base font-semibold">{booking.event?.title || '—'}</p>
                    <p className="text-sm text-muted mt-0.5">
                        {eventDate}{booking.event?.venue_city ? ` · ${booking.event.venue_city}` : ''}
                    </p>
                </div>

                {/* Buyer */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className={`${labelClass} mb-4`}>Buyer</p>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <p className="text-xs text-muted mb-1">Name</p>
                            <p className="text-sm font-semibold">{profile?.full_name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted mb-1">Email</p>
                            <p className="text-sm break-all">{displayEmail || '—'}</p>
                        </div>
                        {profile?.phone && (
                            <div>
                                <p className="text-xs text-muted mb-1">Phone</p>
                                <p className="text-sm">{profile.phone}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted mb-1">Booked On</p>
                            <p className="text-sm">{bookedDate}</p>
                        </div>
                    </div>
                </div>

                {/* Tickets */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className={`${labelClass} mb-4`}>Tickets</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium pb-2">Ticket Type</th>
                                    <th className="font-medium pb-2 text-right">Qty</th>
                                    <th className="font-medium pb-2 text-right">Unit Price</th>
                                    <th className="font-medium pb-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map(row => (
                                    <tr key={row.key} className="border-b border-border last:border-0">
                                        <td className="py-3">
                                            {row.name}
                                            {row.is_group && row.group_size > 1 && (
                                                <span className="block text-xs text-muted mt-0.5">Admits {row.group_size} per ticket</span>
                                            )}
                                            {row.attendee_name && (
                                                <span className="block text-xs text-muted mt-0.5">{row.attendee_name}</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">{row.quantity}</td>
                                        <td className="py-3 text-right text-muted">{booking.is_complimentary ? '—' : formatPence(row.unit_price_pence)}</td>
                                        <td className="py-3 text-right font-medium">{booking.is_complimentary ? '—' : formatPence(row.subtotal_pence)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!booking.is_complimentary && (
                        <div className="border-t border-border mt-4 pt-4 space-y-2">
                            {discountPence > 0 && (
                                <div className="flex justify-between text-sm text-muted">
                                    <span>Promo discount</span>
                                    <span>−{formatPence(discountPence)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline text-base">
                                <span className="font-semibold">Your Earnings</span>
                                <span className="font-heading text-xl">{formatPence(earningsPence)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
