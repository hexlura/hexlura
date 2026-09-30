import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { refundAllBookingsForEvent } from '@/lib/event-refund'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events').select('status, start_at, end_at').eq('id', params.id).single()
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // An event that already ran (or was already cancelled/deleted) must never be
    // cancelled: it would email every attendee a bogus cancellation and refund promise.
    if (['ended', 'cancelled', 'deleted'].includes(event.status)) {
        return NextResponse.json({ error: `Cannot cancel an event that is ${event.status}` }, { status: 409 })
    }
    if (new Date(event.end_at ?? event.start_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Cannot cancel an event that has already taken place' }, { status: 409 })
    }

    await adminClient.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    const { refundedCount, totalRefundedPence } = await refundAllBookingsForEvent(params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'cancel_event',
        entityType: 'event',
        entityId: params.id,
        metadata: { bookings_refunded: refundedCount, total_refunded_pence: totalRefundedPence },
    })

    return NextResponse.json({ success: true, refunded: refundedCount })
}
