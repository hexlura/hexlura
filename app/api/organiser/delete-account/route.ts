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

    // Block deletion if they have upcoming events with confirmed bookings
    const { data: blockingEvents } = await adminClient
        .from('events')
        .select(`
            id,
            bookings!inner(id)
        `)
        .eq('organiser_id', orgProfile.id)
        .not('status', 'in', '("ended","cancelled")')
        .eq('bookings.status', 'confirmed')
        .limit(1)

    if (blockingEvents && blockingEvents.length > 0) {
        return NextResponse.json({
            error: 'You have upcoming events with confirmed bookings. Cancel or end all events before deleting your account.',
        }, { status: 409 })
    }

    // Delete the auth user — cascades to profiles → organiser_profiles → events
    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
