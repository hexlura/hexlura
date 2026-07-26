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
        .from('event_deletion_requests')
        .select('id, event_id, event_title, reason, status, previous_status, admin_notes, requested_at, reviewed_at, organiser:organiser_profiles(org_name), event:events(status)')
        .order('requested_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load requests.' }, { status: 500 })

    // Live confirmed-booking counts/revenue for still-pending requests, so
    // admin sees current numbers even if bookings changed since the request.
    const pendingEventIds = (requests || [])
        .filter(r => r.status === 'pending' && r.event_id)
        .map(r => r.event_id as string)

    const bookingStats: Record<string, { count: number; revenuePence: number }> = {}
    if (pendingEventIds.length > 0) {
        const { data: bookings } = await adminClient
            .from('bookings')
            .select('event_id, total_pence')
            .in('event_id', pendingEventIds)
            .eq('status', 'confirmed')

        for (const b of bookings || []) {
            if (!bookingStats[b.event_id]) bookingStats[b.event_id] = { count: 0, revenuePence: 0 }
            bookingStats[b.event_id].count++
            bookingStats[b.event_id].revenuePence += b.total_pence || 0
        }
    }

    const enriched = (requests || []).map(r => ({
        ...r,
        confirmed_booking_count: r.event_id ? (bookingStats[r.event_id]?.count ?? 0) : 0,
        revenue_pence: r.event_id ? (bookingStats[r.event_id]?.revenuePence ?? 0) : 0,
    }))

    return NextResponse.json({ requests: enriched })
}
