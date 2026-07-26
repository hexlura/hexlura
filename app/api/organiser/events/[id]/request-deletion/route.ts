import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { notifyAdmins } from '@/lib/notify-admins'
import { sendEventDeletionRequestedAdminEmail } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'

const MAX_REASON_LENGTH = 2000

// Organiser-requests / admin-approves event deletion. Replaces the previous
// direct client-side events.delete() call — no event is ever removed here,
// it's only unpublished and queued for admin review. See
// supabase/migrations/062_event_deletion_requests.sql for why.
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // resolveOrganiserId() also resolves door_staff team members (their UI
    // access is scanner-only, but /api/organiser/* isn't covered by the
    // middleware's page-level role gate — this route is the only check).
    // Deleting an event is a destructive, owner/manager-level action, so
    // door_staff must be explicitly excluded here.
    const { data: ownerProfile } = await adminClient
        .from('organiser_profiles')
        .select('user_id')
        .eq('id', organiserId)
        .single()

    if (ownerProfile?.user_id !== user.id) {
        const { data: teamRow } = await adminClient
            .from('organiser_team')
            .select('privilege')
            .eq('user_id', user.id)
            .eq('organiser_id', organiserId)
            .eq('status', 'active')
            .maybeSingle()

        if (!teamRow || teamRow.privilege === 'door_staff') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    const body = await req.json().catch(() => null)
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return NextResponse.json({ error: 'Please tell us why you want to delete this event.' }, { status: 400 })
    if (reason.length > MAX_REASON_LENGTH) {
        return NextResponse.json({ error: `Reason is too long (max ${MAX_REASON_LENGTH} characters).` }, { status: 400 })
    }

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, status, organiser_id')
        .eq('id', params.id)
        .single()

    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    if (event.organiser_id !== organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (event.status === 'deleted') return NextResponse.json({ error: 'This event has already been deleted.' }, { status: 409 })

    const { data: existingPending } = await adminClient
        .from('event_deletion_requests')
        .select('id')
        .eq('event_id', event.id)
        .eq('status', 'pending')
        .maybeSingle()

    if (existingPending) {
        return NextResponse.json({ error: 'A deletion request for this event is already pending admin review.' }, { status: 409 })
    }

    const { data: organiserProfile } = await adminClient
        .from('organiser_profiles')
        .select('org_name')
        .eq('id', organiserId)
        .single()

    const { data: confirmedBookings } = await adminClient
        .from('bookings')
        .select('total_pence')
        .eq('event_id', event.id)
        .eq('status', 'confirmed')

    const confirmedBookingCount = confirmedBookings?.length ?? 0
    const revenuePence = (confirmedBookings || []).reduce((sum, b) => sum + (b.total_pence || 0), 0)

    // Insert the request FIRST — the partial unique index (one pending request
    // per event) atomically closes the double-click race, and if this succeeds
    // but the unpublish step below fails, the worst case is a recorded pending
    // request against a still-live event (recoverable by re-approving/retrying),
    // rather than an event stuck unpublished with no request to explain why.
    const { error: insertError } = await adminClient
        .from('event_deletion_requests')
        .insert({
            event_id: event.id,
            event_title: event.title,
            organiser_id: organiserId,
            reason,
            previous_status: event.status,
        })

    if (insertError) {
        const message = insertError.code === '23505'
            ? 'A deletion request for this event is already pending admin review.'
            : 'Failed to submit request.'
        return NextResponse.json({ error: message }, { status: insertError.code === '23505' ? 409 : 500 })
    }

    await adminClient.from('events').update({ status: 'draft' }).eq('id', event.id)

    await notifyAdmins({
        type: 'event_deletion_requested',
        title: 'Event deletion requested',
        body: `${organiserProfile?.org_name || 'An organiser'} wants to delete "${event.title}"`,
        link: '/admin/event-deletion-requests',
    })

    await sendEventDeletionRequestedAdminEmail({
        orgName: organiserProfile?.org_name || 'Unknown organiser',
        organiserEmail: user.email || 'unknown',
        eventTitle: event.title,
        reason,
        confirmedBookingCount,
        revenuePence,
    })

    await logAuditAction({
        actorId: user.id,
        action: 'organiser_requested_event_deletion',
        entityType: 'event',
        entityId: event.id,
        metadata: { reason, confirmedBookingCount, revenuePence },
    })

    return NextResponse.json({ success: true })
}
