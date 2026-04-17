import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const booking_ref = searchParams.get('booking_ref')
        const event_id = searchParams.get('event_id')

        if (!booking_ref) {
            return NextResponse.json({ error: 'booking_ref is required' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminClient = createAdminClient()

        // Role check — same as POST checkin route
        const { data: checkerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
        const checkerRole = checkerProfile?.role as string | undefined
        let isAuthorized = !!checkerRole && ['door_staff', 'organiser', 'admin'].includes(checkerRole)

        if (!isAuthorized) {
            const { data: teamMember } = await adminClient
                .from('organiser_team')
                .select('privilege')
                .eq('user_id', user.id)
                .eq('privilege', 'door_staff')
                .eq('status', 'active')
                .maybeSingle()
            isAuthorized = !!teamMember
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch booking
        const { data: booking, error: bkErr } = await adminClient
            .from('bookings')
            .select('id, status, event_id')
            .eq('booking_ref', booking_ref)
            .maybeSingle()

        if (bkErr) console.error('Lookup: booking query error:', bkErr.message, bkErr.code, 'ref:', booking_ref)
        if (!booking) {
            console.error('Lookup: no booking found for ref:', booking_ref)
            return NextResponse.json({ error: 'Booking not found', code: 'INVALID' }, { status: 404 })
        }

        if (event_id && booking.event_id !== event_id) {
            return NextResponse.json({ error: 'This ticket is for a different event', code: 'WRONG_EVENT' }, { status: 400 })
        }

        if (booking.status === 'cancelled' || booking.status === 'refunded') {
            return NextResponse.json({ error: 'Booking has been cancelled or refunded', code: 'CANCELLED_TICKET' }, { status: 400 })
        }

        // Fetch all booking items
        const { data: items } = await adminClient
            .from('booking_items')
            .select('id, attendee_name, status, ticket_type:ticket_types(name)')
            .eq('booking_id', booking.id)

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'No tickets found for this booking', code: 'INVALID' }, { status: 404 })
        }

        // Check checkin status for each item
        const itemIds = items.map((i: { id: string }) => i.id)
        const { data: checkins } = await adminClient
            .from('checkins')
            .select('booking_item_id, checked_in_at')
            .in('booking_item_id', itemIds)

        const checkinMap = new Map(
            (checkins || []).map((c: { booking_item_id: string; checked_in_at: string }) => [c.booking_item_id, c.checked_in_at])
        )

        const fmt = new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = items.map((item: any) => {
            const checkedInAt = checkinMap.get(item.id)
            return {
                id: item.id,
                ticket_type: item.ticket_type?.name || 'Ticket',
                attendee_name: item.attendee_name || null,
                checked_in: !!checkedInAt,
                checked_in_at: checkedInAt ? fmt.format(new Date(checkedInAt)) : undefined,
            }
        })

        return NextResponse.json({ booking_ref, items: result })
    } catch (err) {
        console.error('Checkin lookup error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
