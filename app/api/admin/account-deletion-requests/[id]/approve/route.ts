import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundAllBookingsForEvent } from '@/lib/event-refund'
import { sendAccountDeletionApprovedEmail } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'

// Approving account deletion must never let a paid-but-now-unowned booking
// vanish untraceably. Any event with confirmed bookings is refunded and
// retired to a 'deleted' status (kept, not removed) BEFORE the auth user is
// deleted. Because organiser_profiles.user_id cascades from auth.users, we
// detach it (set to null) first so deleting the user does not cascade away
// the now-refunded booking history sitting under organiser_profiles/events.
// Zero-booking events are still cleaned up (hard deleted) since there's
// nothing to preserve there.
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const adminNotes = typeof body?.admin_notes === 'string' ? body.admin_notes.trim().slice(0, 2000) : null

    const { data: claimedRequest } = await adminClient
        .from('organiser_account_deletion_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
        .eq('id', params.id)
        .eq('status', 'pending')
        .select('id, organiser_id, org_name, user_id')
        .single()

    if (!claimedRequest) {
        return NextResponse.json({ error: 'Request not found or already resolved.' }, { status: 409 })
    }
    if (!claimedRequest.organiser_id || !claimedRequest.user_id) {
        return NextResponse.json({ error: 'Organiser account no longer exists.' }, { status: 409 })
    }

    const targetUserId = claimedRequest.user_id
    const organiserId = claimedRequest.organiser_id

    // Grab the profile's current name/email before it's deleted, for the final email.
    const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', targetUserId)
        .single()

    // Capture the pre-existing is_approved value so a failed deletion can be
    // restored to exactly how it was, not blindly re-approved.
    const { data: organiserBefore } = await adminClient
        .from('organiser_profiles')
        .select('is_approved')
        .eq('id', organiserId)
        .single()
    const originalIsApproved = organiserBefore?.is_approved ?? false

    const { data: events } = await adminClient
        .from('events')
        .select('id')
        .eq('organiser_id', organiserId)

    let refundedCount = 0
    let totalRefundedPence = 0

    for (const event of events || []) {
        // Any booking ever made (not just currently-confirmed) means real
        // payment history exists and must be preserved, not hard-deleted —
        // otherwise an event already refunded/cancelled by an earlier,
        // unrelated action would show 0 confirmed bookings and get wiped.
        const { count: anyBookingCount } = await adminClient
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)

        if ((anyBookingCount ?? 0) > 0) {
            const result = await refundAllBookingsForEvent(event.id)
            refundedCount += result.refundedCount
            totalRefundedPence += result.totalRefundedPence
            await adminClient.from('events').update({ status: 'deleted' }).eq('id', event.id)
        } else {
            await adminClient.from('ticket_types').delete().eq('event_id', event.id)
            await adminClient.from('events').delete().eq('id', event.id)
        }
    }

    // Detach the (now historical, retained) organiser profile from the auth
    // user and hide it from public view before deleting the login itself.
    await adminClient
        .from('organiser_profiles')
        .update({ user_id: null, is_approved: false })
        .eq('id', organiserId)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
        console.error('Delete user error:', deleteError)
        // Re-attach the organiser profile — the account was NOT actually
        // deleted, so it must not stay detached/hidden as if it had been.
        await adminClient
            .from('organiser_profiles')
            .update({ user_id: targetUserId, is_approved: originalIsApproved })
            .eq('id', organiserId)
        return NextResponse.json({ error: 'Failed to delete account. Please investigate and retry.' }, { status: 500 })
    }

    // Only send the "your account has been deleted" email once deletion has
    // actually succeeded — never promise something that might not be true.
    if (profile?.email) {
        await sendAccountDeletionApprovedEmail({
            to: profile.email,
            fullName: profile.full_name || 'there',
            orgName: claimedRequest.org_name,
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'admin_approved_account_deletion',
        entityType: 'organiser_account_deletion_request',
        entityId: claimedRequest.id,
        metadata: { organiserId, orgName: claimedRequest.org_name, refundedCount, totalRefundedPence },
    })

    return NextResponse.json({ success: true, refundedCount, totalRefundedPence })
}
