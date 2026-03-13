import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { qr_token, booking_ref, event_id } = body

        if (!qr_token && !booking_ref) {
            return NextResponse.json({ type: 'invalid', message: 'No token or ref provided' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ type: 'invalid', message: 'Unauthorized' }, { status: 401 })

        // Verify organiser owns the event
        const { data: organiser } = await supabase
            .from('organiser_profiles').select('id').eq('user_id', user.id).single()
        if (!organiser) return NextResponse.json({ type: 'invalid' }, { status: 403 })

        let bookingItem: {
            id: string; qr_code: string | null;
            booking: { id: string; status: string; event_id: string; event: { id: string; title: string; organiser_id: string } | null } | null;
            ticket_type: { name: string } | null;
            attendee_name: string | null;
        } | null = null

        if (qr_token) {
            const { data } = await supabase
                .from('booking_items')
                .select('id, qr_code, attendee_name, ticket_type:ticket_types(name), booking:bookings(id, status, event_id, event:events(id, title, organiser_id))')
                .eq('qr_code', qr_token)
                .single()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bookingItem = data as any
        } else if (booking_ref) {
            // Find by booking ref
            const { data: booking } = await supabase
                .from('bookings')
                .select('id, status, event_id, event:events(id, title, organiser_id)')
                .eq('booking_ref', booking_ref)
                .single()

            if (booking) {
                const { data: items } = await supabase
                    .from('booking_items')
                    .select('id, qr_code, attendee_name, ticket_type:ticket_types(name)')
                    .eq('booking_id', booking.id)
                    .limit(1)
                if (items && items[0]) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    bookingItem = { ...items[0], booking: booking as any } as any
                }
            }
        }

        if (!bookingItem) {
            return NextResponse.json({ type: 'invalid', message: 'Ticket not found' })
        }

        const bk = bookingItem.booking
        if (!bk) return NextResponse.json({ type: 'invalid' })

        // Check booking status
        if (bk.status !== 'confirmed') {
            return NextResponse.json({ type: 'invalid', message: 'Booking is not confirmed' })
        }

        // Check event matches
        if (event_id && bk.event_id !== event_id) {
            return NextResponse.json({
                type: 'wrong_event',
                eventTitle: (bk.event as { title?: string } | null)?.title || 'Unknown event',
            })
        }

        // Check organiser owns this event
        const eventOrganiserId = (bk.event as { organiser_id?: string } | null)?.organiser_id
        if (eventOrganiserId !== organiser.id) {
            return NextResponse.json({ type: 'invalid', message: 'Not your event' }, { status: 403 })
        }

        // Check if already checked in
        const { data: existing } = await supabase
            .from('checkins')
            .select('checked_in_at')
            .eq('booking_item_id', bookingItem.id)
            .single()

        if (existing) {
            return NextResponse.json({
                type: 'already',
                checkedInAt: existing.checked_in_at,
                name: bookingItem.attendee_name,
                ticketType: (bookingItem.ticket_type as { name?: string } | null)?.name || 'Ticket',
            })
        }

        // Insert checkin
        const { error } = await supabase
            .from('checkins')
            .insert({
                booking_item_id: bookingItem.id,
                qr_token: bookingItem.qr_code || booking_ref || '',
                checked_in_by: user.id,
            })

        if (error) {
            return NextResponse.json({ type: 'invalid', message: error.message }, { status: 500 })
        }

        return NextResponse.json({
            type: 'success',
            name: bookingItem.attendee_name || 'Attendee',
            ticketType: (bookingItem.ticket_type as { name?: string } | null)?.name || 'Ticket',
        })
    } catch (err) {
        console.error('Checkin error:', err)
        return NextResponse.json({ type: 'invalid', message: 'Server error' }, { status: 500 })
    }
}
