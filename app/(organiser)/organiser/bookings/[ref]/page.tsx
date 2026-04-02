import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'

interface PageProps {
    params: { ref: string }
}

export default async function BookingDetailPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    // Get organiser profile
    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) redirect('/organiser/pending')

    // Security: only fetch the booking if it belongs to one of this organiser's events
    const { data: events } = await adminClient
        .from('events').select('id').eq('organiser_id', organiser.id)
    const eventIds = (events || []).map(e => e.id)

    const notFoundUI = (
        <div className="max-w-3xl">
            <div className="mb-6">
                <Link
                    href="/organiser/bookings"
                    style={{ fontSize: 13, color: '#8888AA', textDecoration: 'none' }}
                >
                    ← Back to Bookings
                </Link>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0F', marginBottom: 8 }}>Booking not found</p>
                <p style={{ fontSize: 13, color: '#8888AA' }}>
                    This booking reference does not exist or does not belong to your organisation.
                </p>
            </div>
        </div>
    )

    if (!eventIds.length) return notFoundUI

    const { data: bookingRaw } = await adminClient
        .from('bookings')
        .select('id, booking_ref, status, is_complimentary, ticket_subtotal_pence, booking_fee_pence, total_pence, created_at, confirmed_at, user_id, event:events(id, title, start_at)')
        .eq('booking_ref', params.ref)
        .in('event_id', eventIds)
        .single()

    if (!bookingRaw) return notFoundUI

    const booking = bookingRaw as unknown as {
        id: string
        booking_ref: string
        status: string
        is_complimentary: boolean | null
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        total_pence: number | null
        created_at: string
        confirmed_at: string | null
        user_id: string | null
        event: { id: string; title: string; start_at: string } | null
    }

    // Get buyer profile (name + phone from profiles; email from auth)
    const { data: profile } = booking.user_id
        ? await adminClient
            .from('profiles')
            .select('full_name, phone')
            .eq('id', booking.user_id)
            .single()
        : { data: null }

    let buyerEmail = ''
    if (booking.user_id) {
        const { data: { user: buyerUser } } = await adminClient.auth.admin.getUserById(booking.user_id)
        buyerEmail = buyerUser?.email || ''
    }

    // Get booking items
    const { data: itemsRaw } = await adminClient
        .from('booking_items')
        .select('id, quantity, unit_price_pence, attendee_name, attendee_email, ticket_type_id, ticket_type:ticket_types(name)')
        .eq('booking_id', booking.id)

    const items = (itemsRaw || []) as unknown as {
        id: string
        quantity: number
        unit_price_pence: number | null
        attendee_name: string | null
        attendee_email: string | null
        ticket_type_id: string | null
        ticket_type: { name: string } | null
    }[]

    // Derive email: prefer auth email, fall back to attendee_email on first item
    const displayEmail = buyerEmail || items[0]?.attendee_email || ''

    const statusStyles: Record<string, { text: string; bg: string; border: string }> = {
        confirmed: { text: '#00C48A', bg: 'rgba(0,196,138,0.08)', border: 'rgba(0,196,138,0.25)' },
        pending:   { text: '#F5A623', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)' },
        cancelled: { text: '#E63950', bg: 'rgba(230,57,80,0.08)',  border: 'rgba(230,57,80,0.25)' },
        refunded:  { text: '#8888AA', bg: 'rgba(136,136,170,0.08)', border: 'rgba(136,136,170,0.25)' },
    }
    const sc = statusStyles[booking.status] || { text: '#8888AA', bg: 'transparent', border: '#E0E0E0' }

    const eventDate = booking.event?.start_at
        ? new Date(booking.event.start_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
          })
        : '—'

    const bookedDate = new Date(booking.created_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    return (
        <div className="max-w-3xl">
            {/* Back */}
            <div style={{ marginBottom: 24 }}>
                <Link
                    href="/organiser/bookings"
                    style={{ fontSize: 13, color: '#8888AA', textDecoration: 'none' }}
                >
                    ← Back to Bookings
                </Link>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
                <div>
                    <p style={{ fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>Booking Reference</p>
                    <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#0A0A0F', letterSpacing: '1px', lineHeight: 1 }}>
                        {booking.booking_ref}
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                    {booking.is_complimentary && (
                        <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 10px',
                            border: '1px solid rgba(0,196,138,0.3)', background: 'rgba(0,196,138,0.08)',
                            color: '#00C48A', letterSpacing: '1px', textTransform: 'uppercase',
                        }}>
                            Complimentary
                        </span>
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600, padding: '4px 14px',
                        border: `1px solid ${sc.border}`, background: sc.bg, color: sc.text,
                    }}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Event */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 24 }}>
                    <p style={{ fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Event</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>{booking.event?.title || '—'}</p>
                    <p style={{ fontSize: 13, color: '#666677' }}>{eventDate}</p>
                </div>

                {/* Buyer */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 24 }}>
                    <p style={{ fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Buyer</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 3 }}>Name</p>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0F' }}>{profile?.full_name || '—'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 3 }}>Email</p>
                            <p style={{ fontSize: 14, color: '#0A0A0F' }}>{displayEmail || '—'}</p>
                        </div>
                        {profile?.phone && (
                            <div>
                                <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 3 }}>Phone</p>
                                <p style={{ fontSize: 14, color: '#0A0A0F' }}>{profile.phone}</p>
                            </div>
                        )}
                        <div>
                            <p style={{ fontSize: 11, color: '#8888AA', marginBottom: 3 }}>Booked On</p>
                            <p style={{ fontSize: 14, color: '#0A0A0F' }}>{bookedDate}</p>
                        </div>
                    </div>
                </div>

                {/* Tickets table */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 24 }}>
                    <p style={{ fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Tickets</p>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                                    <th style={{ textAlign: 'left', color: '#8888AA', fontWeight: 400, paddingBottom: 8, paddingRight: 16 }}>Ticket Type</th>
                                    <th style={{ textAlign: 'right', color: '#8888AA', fontWeight: 400, paddingBottom: 8, paddingRight: 16, whiteSpace: 'nowrap' }}>Qty</th>
                                    <th style={{ textAlign: 'right', color: '#8888AA', fontWeight: 400, paddingBottom: 8, paddingRight: 16, whiteSpace: 'nowrap' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right', color: '#8888AA', fontWeight: 400, paddingBottom: 8, whiteSpace: 'nowrap' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                                        <td style={{ padding: '10px 16px 10px 0', color: '#0A0A0F', fontWeight: 500 }}>
                                            {item.ticket_type?.name || '—'}
                                            {item.attendee_name && (
                                                <span style={{ display: 'block', fontSize: 11, color: '#8888AA', fontWeight: 400, marginTop: 2 }}>
                                                    {item.attendee_name}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 16px 10px 0', textAlign: 'right', color: '#0A0A0F' }}>
                                            {item.quantity}
                                        </td>
                                        <td style={{ padding: '10px 16px 10px 0', textAlign: 'right', color: '#666677' }}>
                                            {booking.is_complimentary ? '—' : formatPence(item.unit_price_pence || 0)}
                                        </td>
                                        <td style={{ padding: '10px 0', textAlign: 'right', color: '#0A0A0F', fontWeight: 600 }}>
                                            {booking.is_complimentary ? '—' : formatPence((item.unit_price_pence || 0) * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    {!booking.is_complimentary && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E0E0E0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666677', marginBottom: 6 }}>
                                <span>Ticket Subtotal</span>
                                <span>{formatPence(booking.ticket_subtotal_pence || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666677', marginBottom: 10 }}>
                                <span>Booking Fee</span>
                                <span>{formatPence(booking.booking_fee_pence || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#0A0A0F', paddingTop: 10, borderTop: '1px solid #E0E0E0' }}>
                                <span>Total Paid</span>
                                <span>{formatPence(booking.total_pence || 0)}</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
