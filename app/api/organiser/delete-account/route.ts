import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notify-admins'
import { sendAccountDeletionRequestedAdminEmail } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'

const MAX_REASON_LENGTH = 2000

// Organiser-requests / admin-approves account deletion. No longer deletes
// anything directly — creates a review request instead, same pattern as
// event deletion. See supabase/migrations/063_organiser_account_deletion_requests.sql.
export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'organiser') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: orgProfile } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name')
        .eq('user_id', user.id)
        .single()

    if (!orgProfile) return NextResponse.json({ error: 'Organiser profile not found' }, { status: 404 })

    const body = await req.json().catch(() => null)
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return NextResponse.json({ error: 'Please tell us why you want to delete your account.' }, { status: 400 })
    if (reason.length > MAX_REASON_LENGTH) {
        return NextResponse.json({ error: `Reason is too long (max ${MAX_REASON_LENGTH} characters).` }, { status: 400 })
    }

    const { data: existingPending } = await adminClient
        .from('organiser_account_deletion_requests')
        .select('id')
        .eq('organiser_id', orgProfile.id)
        .eq('status', 'pending')
        .maybeSingle()

    if (existingPending) {
        return NextResponse.json({ error: 'An account deletion request is already pending admin review.' }, { status: 409 })
    }

    const { data: theirEvents } = await adminClient
        .from('events')
        .select('id')
        .eq('organiser_id', orgProfile.id)

    const eventIds = (theirEvents || []).map(e => e.id)
    let confirmedBookingCount = 0
    if (eventIds.length > 0) {
        const { count } = await adminClient
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .eq('status', 'confirmed')
        confirmedBookingCount = count ?? 0
    }

    const { error: insertError } = await adminClient
        .from('organiser_account_deletion_requests')
        .insert({
            organiser_id: orgProfile.id,
            user_id: user.id,
            org_name: orgProfile.org_name,
            requester_email: user.email || 'unknown',
            reason,
        })

    if (insertError) {
        const message = insertError.code === '23505'
            ? 'An account deletion request is already pending admin review.'
            : 'Failed to submit request.'
        return NextResponse.json({ error: message }, { status: insertError.code === '23505' ? 409 : 500 })
    }

    await notifyAdmins({
        type: 'account_deletion_requested',
        title: 'Account deletion requested',
        body: `${orgProfile.org_name} wants to delete their account`,
        link: '/admin/account-deletion-requests',
    })

    await sendAccountDeletionRequestedAdminEmail({
        orgName: orgProfile.org_name,
        requesterEmail: user.email || 'unknown',
        reason,
        eventCount: eventIds.length,
        confirmedBookingCount,
    })

    await logAuditAction({
        actorId: user.id,
        action: 'organiser_requested_account_deletion',
        entityType: 'organiser_profile',
        entityId: orgProfile.id,
        metadata: { reason, eventCount: eventIds.length, confirmedBookingCount },
    })

    return NextResponse.json({ success: true })
}
