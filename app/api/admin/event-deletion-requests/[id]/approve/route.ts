import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundAllBookingsForEvent } from '@/lib/event-refund'
import { logAuditAction } from '@/lib/audit'

// Approving deletion never silently destroys paid bookings: if the event has
// confirmed bookings, they're refunded first and the event is retired to a
// terminal 'deleted' status (row + refunded bookings kept for audit/dispute
// evidence). Only a genuinely zero-booking event is ever physically removed.
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const adminNotes = typeof body?.admin_notes === 'string' ? body.admin_notes.trim().slice(0, 2000) : null

    // Atomically claim the request so a concurrent approve/reject can't double-process it.
    const { data: claimedRequest } = await adminClient
        .from('event_deletion_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
        .eq('id', params.id)
        .eq('status', 'pending')
        .select('id, event_id, event_title, organiser_id')
        .single()

    if (!claimedRequest) {
        return NextResponse.json({ error: 'Request not found or already resolved.' }, { status: 409 })
    }

    let refundedCount = 0
    let totalRefundedPence = 0

    if (claimedRequest.event_id) {
        // Checking for ANY booking (not just currently-confirmed ones) is
        // deliberate: an event whose bookings were already refunded/cancelled
        // by an earlier, unrelated action would show 0 confirmed bookings but
        // still has real payment history that must be preserved, not wiped.
        const { count: anyBookingCount } = await adminClient
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', claimedRequest.event_id)

        if ((anyBookingCount ?? 0) > 0) {
            const result = await refundAllBookingsForEvent(claimedRequest.event_id)
            refundedCount = result.refundedCount
            totalRefundedPence = result.totalRefundedPence
            await adminClient.from('events').update({ status: 'deleted' }).eq('id', claimedRequest.event_id)
        } else {
            await adminClient.from('ticket_types').delete().eq('event_id', claimedRequest.event_id)
            await adminClient.from('events').delete().eq('id', claimedRequest.event_id)
        }
    }

    // Get the requesting organiser's user_id to notify them in-app.
    const { data: organiserProfile } = await adminClient
        .from('organiser_profiles')
        .select('user_id')
        .eq('id', claimedRequest.organiser_id)
        .single()

    if (organiserProfile?.user_id) {
        await adminClient.from('notifications').insert({
            user_id: organiserProfile.user_id,
            type: 'event_deletion_approved',
            title: 'Event deletion approved',
            body: `"${claimedRequest.event_title}" has been permanently deleted.`,
            link: '/organiser/events',
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'admin_approved_event_deletion',
        entityType: 'event_deletion_request',
        entityId: claimedRequest.id,
        metadata: {
            eventId: claimedRequest.event_id,
            eventTitle: claimedRequest.event_title,
            refundedCount,
            totalRefundedPence,
        },
    })

    return NextResponse.json({ success: true, refundedCount, totalRefundedPence })
}
