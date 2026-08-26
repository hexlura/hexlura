import { NextResponse, NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/supabase/getRequestUser'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveDoorStaffContext, isEventAssigned } from '@/lib/checkin/authorize'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const booking_ref = searchParams.get('booking_ref')
        const event_id = searchParams.get('event_id')

        if (!booking_ref) {
            return NextResponse.json({ error: 'booking_ref is required' }, { status: 400 })
        }

        const user = await getRequestUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminClient = createAdminClient()

        const ctx = await resolveDoorStaffContext(user.id)
        if (!ctx.isAuthorized) {
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
            return NextResponse.json({ error: 'Booking not found', code: 'INVALID' }, { status: 404 })
        }

        // Wrong event check
        if (event_id && booking.event_id !== event_id) {
            return NextResponse.json({ error: 'This ticket is for a different event', code: 'WRONG_EVENT' }, { status: 400 })
        }

        // Ownership check — verify the caller is authorised for this event's organiser
        if (!ctx.isAdmin) {
            const { data: eventRow } = await adminClient
                .from('events')
                .select('organiser_id')
                .eq('id', booking.event_id)
                .single()

            if (!eventRow) {
                return NextResponse.json({ error: 'Event not found', code: 'INVALID' }, { status: 404 })
            }

            if (!isEventAssigned(ctx, eventRow.organiser_id)) {
                return NextResponse.json({ error: 'Not authorized for this event', code: 'INVALID' }, { status: 403 })
            }
        }

        if (booking.status === 'cancelled' || booking.status === 'refunded') {
            return NextResponse.json({ error: 'Booking has been cancelled or refunded', code: 'CANCELLED_TICKET' }, { status: 400 })
        }

        // Fetch all booking items
        const { data: items } = await adminClient
            .from('booking_items')
            .select('id, attendee_name, quantity, ticket_type:ticket_types(name)')
            .eq('booking_id', booking.id)

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'No tickets found for this booking', code: 'INVALID' }, { status: 404 })
        }

        // Fetch all checkin rows for these items
        const itemIds = items.map((i: { id: string }) => i.id)
        const { data: checkins } = await adminClient
            .from('checkins')
            .select('booking_item_id, checked_in_at')
            .in('booking_item_id', itemIds)
            .order('checked_in_at', { ascending: true })

        // Count scans per item and record first scan time
        const scanCountMap = new Map<string, number>()
        const firstScanMap = new Map<string, string>()
        for (const c of (checkins || [])) {
            scanCountMap.set(c.booking_item_id, (scanCountMap.get(c.booking_item_id) ?? 0) + 1)
            if (!firstScanMap.has(c.booking_item_id)) {
                firstScanMap.set(c.booking_item_id, c.checked_in_at)
            }
        }

        const fmt = new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = items.map((item: any) => {
            const quantity = item.quantity || 1
            const scannedCount = scanCountMap.get(item.id) ?? 0
            const firstScan = firstScanMap.get(item.id)
            return {
                id: item.id,
                ticket_type: item.ticket_type?.name || 'Ticket',
                attendee_name: item.attendee_name || null,
                quantity,
                scanned_count: scannedCount,
                checked_in: scannedCount >= quantity,
                checked_in_at: scannedCount > 0 && quantity === 1 && firstScan
                    ? fmt.format(new Date(firstScan))
                    : undefined,
            }
        })

        return NextResponse.json({ booking_ref, items: result })
    } catch (err) {
        console.error('Checkin lookup error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
