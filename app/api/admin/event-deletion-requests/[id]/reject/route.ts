import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

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
        .from('event_deletion_requests')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
        .eq('id', params.id)
        .eq('status', 'pending')
        .select('id, event_id, event_title, organiser_id, previous_status')
        .single()

    if (!claimedRequest) {
        return NextResponse.json({ error: 'Request not found or already resolved.' }, { status: 409 })
    }

    if (claimedRequest.event_id) {
        // Only restore previous_status if the event is still exactly in the
        // 'draft' (unpublished-for-review) state this request put it in.
        // If something else already moved it on — e.g. the whole account was
        // separately approved for deletion in the meantime and this event was
        // soft-deleted, or the organiser somehow republished it — blindly
        // overwriting that would resurrect/clobber a state this request
        // doesn't know about.
        await adminClient
            .from('events')
            .update({ status: claimedRequest.previous_status })
            .eq('id', claimedRequest.event_id)
            .eq('status', 'draft')
    }

    const { data: organiserProfile } = await adminClient
        .from('organiser_profiles')
        .select('user_id')
        .eq('id', claimedRequest.organiser_id)
        .single()

    if (organiserProfile?.user_id) {
        await adminClient.from('notifications').insert({
            user_id: organiserProfile.user_id,
            type: 'event_deletion_rejected',
            title: 'Event deletion request rejected',
            body: adminNotes
                ? `Your request to delete "${claimedRequest.event_title}" was declined: ${adminNotes}`
                : `Your request to delete "${claimedRequest.event_title}" was declined. The event is live again.`,
            link: '/organiser/events',
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'admin_rejected_event_deletion',
        entityType: 'event_deletion_request',
        entityId: claimedRequest.id,
        metadata: { eventId: claimedRequest.event_id, eventTitle: claimedRequest.event_title, adminNotes },
    })

    return NextResponse.json({ success: true })
}
