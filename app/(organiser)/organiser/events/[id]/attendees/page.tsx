import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { AttendeesClient } from './attendees-client'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'

interface PageProps {
    params: { id: string }
}

export default async function AttendeesPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: event } = await serviceClient
        .from('events')
        .select('id, title, start_at')
        .eq('id', params.id)
        .eq('organiser_id', organiserId)
        .single()
    if (!event) notFound()

    // Get all confirmed bookings for this event
    const { data: bookings } = await serviceClient
        .from('bookings')
        .select('id, booking_ref, ticket_subtotal_pence, created_at')
        .eq('event_id', params.id)
        .eq('status', 'confirmed')

    const bookingIds = (bookings || []).map(b => b.id)

    const { data: items } = bookingIds.length
        ? await serviceClient
            .from('booking_items')
            .select('id, booking_id, quantity, attendee_name, attendee_email, ticket_type_id, ticket_type:ticket_types(name), qr_code')
            .in('booking_id', bookingIds)
        : { data: [] }

    // Get checkins
    const itemIds = (items || []).map(i => i.id)
    const { data: checkins } = itemIds.length
        ? await serviceClient
            .from('checkins')
            .select('booking_item_id, checked_in_at')
            .in('booking_item_id', itemIds)
        : { data: [] }

    const checkinMap = new Map((checkins || []).map(c => [c.booking_item_id, c.checked_in_at]))

    // Get ticket types for filter dropdown
    const { data: ticketTypes } = await serviceClient
        .from('ticket_types').select('id, name').eq('event_id', params.id)

    // Build attendee rows — one row per PHYSICAL TICKET by expanding booking_items by quantity.
    // A booking_item with quantity=3 produces 3 separate rows (not one row with qty=3).
    // Group tickets (is_group on ticket_types) are a separate feature and unaffected here.
    const bookingMap = new Map((bookings || []).map(b => [b.id, b]))

    const attendees = (items || []).flatMap(item => {
        const booking = bookingMap.get(item.booking_id)
        const checkedInAt = checkinMap.get(item.id) || null
        const qty = item.quantity || 1

        return Array.from({ length: qty }, (_, idx) => ({
            id: `${item.id}-${idx}`,
            bookingRef: booking?.booking_ref || '',
            name: item.attendee_name || 'Guest',
            email: item.attendee_email || '',
            ticketTypeId: item.ticket_type_id || '',
            ticketTypeName: (item.ticket_type as { name?: string } | null)?.name || '—',
            quantity: 1,
            bookedAt: booking?.created_at || '',
            checkedIn: !!checkedInAt,
            checkedInAt: checkedInAt,
        }))
    })

    // Summary stats — after expansion each element is exactly 1 physical ticket
    const totalTickets = attendees.length
    const checkedIn = attendees.filter(a => a.checkedIn).length
    const totalRevenue = (bookings || []).reduce((s, b) => s + (b.ticket_subtotal_pence || 0), 0)

    const eventDate = new Date(event.start_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    })

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl text-text tracking-wide">ATTENDEES</h1>
                <p className="text-muted text-sm mt-1">{event.title} · {eventDate}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total Tickets', value: String(totalTickets) },
                    { label: 'Checked In', value: `${checkedIn} / ${totalTickets}` },
                    { label: 'Revenue', value: formatPence(totalRevenue) },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-none p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="font-heading text-3xl text-text">{s.value}</p>
                    </div>
                ))}
            </div>

            <AttendeesClient
                eventId={params.id}
                eventTitle={event.title}
                attendees={attendees}
                ticketTypes={(ticketTypes || []).map(t => ({ id: t.id, name: t.name }))}
            />
        </div>
    )
}
