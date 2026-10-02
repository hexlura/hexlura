import { createServiceClient } from '@/lib/supabase/service'

// Loads one event's attendee list for an organiser. Returns null when the event does not
// exist or does not belong to this organiser (callers decide how to present that).
// Query failures throw instead of silently producing an empty list.

const PAGE_SIZE = 1000 // PostgREST row cap per request
const CHUNK = 100 // keeps `.in()` URLs short for large events

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

export interface AttendeeRow {
    id: string
    bookingRef: string
    name: string
    email: string
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
    ticketIndex: number
    totalInGroup: number
    bookedAt: string
    checkedIn: boolean
    checkedInAt: string | null
}

export interface EventAttendeesData {
    event: { id: string; title: string; start_at: string }
    attendees: AttendeeRow[]
    ticketTypes: { id: string; name: string }[]
    totalTickets: number
    checkedIn: number
    totalRevenuePence: number
}

export async function loadEventAttendees(eventId: string, organiserId: string): Promise<EventAttendeesData | null> {
    const serviceClient = createServiceClient()

    const { data: event, error: eventErr } = await serviceClient
        .from('events')
        .select('id, title, start_at')
        .eq('id', eventId)
        .eq('organiser_id', organiserId)
        .maybeSingle()
    if (eventErr) throw eventErr
    if (!event) return null

    // All confirmed bookings for this event (paged past the 1000-row cap)
    type BookingRow = { id: string; booking_ref: string; ticket_subtotal_pence: number | null; discount_pence: number | null; created_at: string }
    const bookings: BookingRow[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await serviceClient
            .from('bookings')
            .select('id, booking_ref, ticket_subtotal_pence, discount_pence, created_at')
            .eq('event_id', eventId)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        bookings.push(...((data || []) as BookingRow[]))
        if (!data || data.length < PAGE_SIZE) break
    }

    type ItemRow = {
        id: string; booking_id: string; quantity: number | null; attendee_name: string | null; attendee_email: string | null
        ticket_type_id: string | null; ticket_type: { name?: string } | null
    }
    const items: ItemRow[] = []
    for (const ids of chunk(bookings.map(b => b.id), CHUNK)) {
        const { data, error } = await serviceClient
            .from('booking_items')
            .select('id, booking_id, quantity, attendee_name, attendee_email, ticket_type_id, ticket_type:ticket_types(name)')
            .in('booking_id', ids)
        if (error) throw error
        items.push(...((data || []) as unknown as ItemRow[]))
    }

    const checkinMap = new Map<string, string>()
    for (const ids of chunk(items.map(i => i.id), CHUNK)) {
        const { data, error } = await serviceClient
            .from('checkins')
            .select('booking_item_id, checked_in_at')
            .in('booking_item_id', ids)
        if (error) throw error
        for (const c of data || []) checkinMap.set(c.booking_item_id as string, c.checked_in_at as string)
    }

    const { data: ticketTypes, error: ttErr } = await serviceClient
        .from('ticket_types').select('id, name').eq('event_id', eventId)
    if (ttErr) throw ttErr

    // One row per PHYSICAL TICKET: a booking_item with quantity=3 produces 3 rows.
    const bookingMap = new Map(bookings.map(b => [b.id, b]))
    const attendees: AttendeeRow[] = items.flatMap(item => {
        const booking = bookingMap.get(item.booking_id)
        const checkedInAt = checkinMap.get(item.id) || null
        const qty = item.quantity || 1
        return Array.from({ length: qty }, (_, idx) => ({
            id: `${item.id}-${idx}`,
            bookingRef: booking?.booking_ref || '',
            name: item.attendee_name || 'Guest',
            email: item.attendee_email || '',
            ticketTypeId: item.ticket_type_id || '',
            ticketTypeName: item.ticket_type?.name || '—',
            quantity: 1,
            ticketIndex: idx + 1,
            totalInGroup: qty,
            bookedAt: booking?.created_at || '',
            checkedIn: !!checkedInAt,
            checkedInAt,
        }))
    })

    return {
        event: event as { id: string; title: string; start_at: string },
        attendees,
        ticketTypes: (ticketTypes || []).map(t => ({ id: t.id as string, name: t.name as string })),
        totalTickets: attendees.length,
        checkedIn: attendees.filter(a => a.checkedIn).length,
        totalRevenuePence: bookings.reduce((s, b) => s + (b.ticket_subtotal_pence || 0) - (b.discount_pence || 0), 0),
    }
}
