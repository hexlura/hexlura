import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Verify caller is an organiser
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'organiser') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get their organiser profile
    const { data: orgProfile } = await adminClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!orgProfile) {
        return NextResponse.json({ error: 'Organiser profile not found' }, { status: 404 })
    }

    // Block deletion if ANY of their events have confirmed bookings (past or future).
    // Deleting the account cascades: organiser → events → bookings, wiping financial records.
    const { data: theirEvents } = await adminClient
        .from('events')
        .select('id')
        .eq('organiser_id', orgProfile.id)

    if (theirEvents && theirEvents.length > 0) {
        const eventIds = theirEvents.map(e => e.id)
        const { data: confirmedBookings } = await adminClient
            .from('bookings')
            .select('id')
            .in('event_id', eventIds)
            .eq('status', 'confirmed')
            .limit(1)

        if (confirmedBookings && confirmedBookings.length > 0) {
            return NextResponse.json({
                error: 'Your account has events with confirmed bookings which must be retained for financial records. Please contact support@hexlura.com to request account deletion.',
            }, { status: 409 })
        }
    }

    // Safe to delete — no confirmed bookings exist on any of their events.
    // Cascade: auth.users → profiles → organiser_profiles → events → ticket_types
    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
