import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEventCancelledEmail } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, slug, start_at, end_at, status')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // An event that already ran (or was already cancelled/deleted) must never be
    // cancelled: it would email every attendee a bogus cancellation and refund promise.
    const blockedReason = ['ended', 'cancelled', 'deleted'].includes(event.status)
        ? `event is ${event.status}`
        : new Date(event.end_at ?? event.start_at).getTime() < Date.now()
            ? 'event has already taken place'
            : null
    if (blockedReason) {
        await logAuditAction({
            actorId: user.id,
            action: 'cancel_event_blocked',
            entityType: 'event',
            entityId: event.id,
            metadata: { source: 'organiser', eventTitle: event.title, reason: blockedReason },
        })
        return NextResponse.json({ error: `Cannot cancel: ${blockedReason}` }, { status: 409 })
    }

    const { error: cancelError } = await adminClient.from('events').update({ status: 'cancelled' }).eq('id', params.id)
    if (cancelError) {
        console.error('Failed to cancel event:', cancelError)
        return NextResponse.json({ error: 'Failed to cancel event.' }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'cancel_event',
        entityType: 'event',
        entityId: event.id,
        metadata: { source: 'organiser', eventTitle: event.title, previousStatus: event.status },
    })

    try {
        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, user_id, total_pence')
            .eq('event_id', params.id)
            .eq('status', 'confirmed')

        const bookingList = (bookings || []) as { id: string; user_id: string; total_pence: number | null }[]
        const bookingIds = bookingList.map(b => b.id)

        for (const b of bookingList) {
            void adminClient.from('notifications').insert({
                user_id: b.user_id,
                type: 'event_cancelled',
                title: 'Event cancelled',
                body: `${event.title} has been cancelled. If you paid for tickets, you will receive a full refund.`,
                link: '/bookings',
            })
        }

        if (bookingIds.length) {
            const { data: items } = await adminClient
                .from('booking_items')
                .select('attendee_email')
                .in('booking_id', bookingIds)

            const emails = Array.from(new Set((items || []).map(i => i.attendee_email).filter(Boolean))) as string[]

            const hasPaidTickets = bookingList.some(b => (b.total_pence ?? 0) > 0)
            const eventDate = new Date(event.start_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })

            if (emails.length) {
                await sendEventCancelledEmail({ emails, eventTitle: event.title, eventDate, hasPaidTickets })
            }
        }
    } catch (err) {
        console.error('Failed to send cancellation emails:', err)
    }

    return NextResponse.json({ success: true })
}
