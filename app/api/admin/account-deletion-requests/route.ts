import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: requests, error } = await adminClient
        .from('organiser_account_deletion_requests')
        .select('id, organiser_id, org_name, requester_email, reason, status, admin_notes, requested_at, reviewed_at')
        .order('requested_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load requests.' }, { status: 500 })

    // Live event/booking counts for still-pending requests.
    const pendingOrganiserIds = (requests || [])
        .filter(r => r.status === 'pending' && r.organiser_id)
        .map(r => r.organiser_id as string)

    const stats: Record<string, { eventCount: number; confirmedBookingCount: number }> = {}
    if (pendingOrganiserIds.length > 0) {
        const { data: events } = await adminClient
            .from('events')
            .select('id, organiser_id')
            .in('organiser_id', pendingOrganiserIds)

        const eventsByOrganiser: Record<string, string[]> = {}
        for (const e of events || []) {
            if (!eventsByOrganiser[e.organiser_id]) eventsByOrganiser[e.organiser_id] = []
            eventsByOrganiser[e.organiser_id].push(e.id)
            if (!stats[e.organiser_id]) stats[e.organiser_id] = { eventCount: 0, confirmedBookingCount: 0 }
            stats[e.organiser_id].eventCount++
        }

        const allEventIds = (events || []).map(e => e.id)
        if (allEventIds.length > 0) {
            const { data: bookings } = await adminClient
                .from('bookings')
                .select('event_id')
                .in('event_id', allEventIds)
                .eq('status', 'confirmed')

            const eventToOrganiser: Record<string, string> = {}
            for (const [organiserId, ids] of Object.entries(eventsByOrganiser)) {
                for (const id of ids) eventToOrganiser[id] = organiserId
            }
            for (const b of bookings || []) {
                const organiserId = eventToOrganiser[b.event_id]
                if (organiserId) stats[organiserId].confirmedBookingCount++
            }
        }
    }

    const enriched = (requests || []).map(r => ({
        ...r,
        event_count: r.organiser_id ? (stats[r.organiser_id]?.eventCount ?? 0) : 0,
        confirmed_booking_count: r.organiser_id ? (stats[r.organiser_id]?.confirmedBookingCount ?? 0) : 0,
    }))

    return NextResponse.json({ requests: enriched })
}
