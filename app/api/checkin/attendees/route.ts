import { NextResponse, NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/supabase/getRequestUser'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveDoorStaffContext, isEventAssigned } from '@/lib/checkin/authorize'

/**
 * Full attendee list for one event, for the mobile app's Attendees screen.
 * Uses the same scanned_count/quantity model as /api/checkin/lookup (not the
 * simpler per-row flag on the organiser web attendees page) so group tickets
 * with partial check-ins are represented consistently with the scanner flow.
 * Deliberately omits attendee_email — door staff match guests by name or
 * booking ref at the door, not email; least-privilege for this role.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const eventId = searchParams.get('event_id')
        if (!eventId) {
            return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
        }

        const user = await getRequestUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const ctx = await resolveDoorStaffContext(user.id)
        if (!ctx.isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const adminClient = createAdminClient()

        const { data: event } = await adminClient
            .from('events')
            .select('id, title, start_at, organiser_id')
            .eq('id', eventId)
            .single()

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }
        if (!isEventAssigned(ctx, event.organiser_id)) {
            return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
        }

        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, booking_ref')
            .eq('event_id', eventId)
            .eq('status', 'confirmed')

        const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id)
        const bookingRefMap = new Map((bookings ?? []).map((b: { id: string; booking_ref: string }) => [b.id, b.booking_ref]))

        const { data: items } = bookingIds.length
            ? await adminClient
                .from('booking_items')
                .select('id, booking_id, quantity, attendee_name, ticket_type:ticket_types(name)')
                .in('booking_id', bookingIds)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : { data: [] as any[] }

        const itemIds = (items ?? []).map((i: { id: string }) => i.id)
        const { data: checkins } = itemIds.length
            ? await adminClient
                .from('checkins')
                .select('booking_item_id, checked_in_at')
                .in('booking_item_id', itemIds)
                .order('checked_in_at', { ascending: true })
            : { data: [] as { booking_item_id: string; checked_in_at: string }[] }

        const scanCountMap = new Map<string, number>()
        const firstScanMap = new Map<string, string>()
        for (const c of checkins ?? []) {
            scanCountMap.set(c.booking_item_id, (scanCountMap.get(c.booking_item_id) ?? 0) + 1)
            if (!firstScanMap.has(c.booking_item_id)) firstScanMap.set(c.booking_item_id, c.checked_in_at)
        }

        const fmt = new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        })

        let total = 0
        let checkedIn = 0

        const attendees = (items ?? [])
            .map((item) => {
                const quantity = item.quantity || 1
                const scannedCount = scanCountMap.get(item.id) ?? 0
                const firstScan = firstScanMap.get(item.id)
                total += quantity
                checkedIn += Math.min(scannedCount, quantity)
                return {
                    id: item.id,
                    bookingRef: bookingRefMap.get(item.booking_id) || '',
                    name: item.attendee_name || 'Guest',
                    ticketType: item.ticket_type?.name || 'Ticket',
                    quantity,
                    scannedCount,
                    checkedIn: scannedCount >= quantity,
                    checkedInAt: scannedCount > 0 && firstScan ? fmt.format(new Date(firstScan)) : undefined,
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

        return NextResponse.json({
            event: { id: event.id, title: event.title, start_at: event.start_at },
            total,
            checkedIn,
            attendees,
        })
    } catch (err) {
        console.error('Checkin attendees error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
