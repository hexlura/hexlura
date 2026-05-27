import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { sendEventCancelledEmail } from '@/lib/email'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await adminClient.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    const { data: cancelledEvent } = await adminClient
        .from('events')
        .select('title, start_at')
        .eq('id', params.id)
        .single()

    // Get all confirmed bookings for this event and mark as refunded
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, user_id, total_pence, stripe_payment_intent_id')
        .eq('event_id', params.id)
        .eq('status', 'confirmed')

    let refundedCount = 0
    let totalRefundedPence = 0

    for (const booking of (bookings || []) as { id: string; total_pence: number | null; stripe_payment_intent_id: string | null }[]) {
        if (booking.stripe_payment_intent_id) {
            try {
                const stripe = (await import('stripe')).default
                const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
                await stripeClient.refunds.create({ payment_intent: booking.stripe_payment_intent_id })
            } catch {
                // Continue even if Stripe refund fails
            }
        }
        await adminClient.from('bookings').update({ status: 'refunded' }).eq('id', booking.id)
        // Reverse any promoter commission attributed to this booking (event cancellation)
        await reversePromoterEarningsForBooking(booking.id)
        // Notify attendee
        void adminClient.from('notifications').insert({
            user_id: (booking as { id: string; user_id: string; total_pence: number | null; stripe_payment_intent_id: string | null }).user_id,
            type: 'event_cancelled',
            title: 'Event cancelled',
            body: `${cancelledEvent?.title ?? 'An event'} has been cancelled. If you paid, a full refund is on its way.`,
            link: '/bookings',
        })
        refundedCount++
        totalRefundedPence += booking.total_pence || 0
    }

    // Send cancellation emails to attendees
    try {
        const { data: allItems } = await adminClient
            .from('booking_items')
            .select('attendee_email')
            .in('booking_id', (bookings || []).map(b => b.id))

        const emails = Array.from(new Set((allItems || []).map(i => i.attendee_email).filter(Boolean))) as string[]
        const hasPaidTickets = (bookings || []).some(b => (b.total_pence || 0) > 0)
        const eventDate = cancelledEvent?.start_at
            ? new Date(cancelledEvent.start_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })
            : ''

        if (emails.length) {
            await sendEventCancelledEmail({
                emails,
                eventTitle: cancelledEvent?.title ?? 'Your event',
                eventDate,
                hasPaidTickets,
            })
        }
    } catch (err) {
        console.error('Failed to send cancellation emails:', err)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'cancel_event',
        entityType: 'event',
        entityId: params.id,
        metadata: { bookings_refunded: refundedCount, total_refunded_pence: totalRefundedPence },
    })

    return NextResponse.json({ success: true, refunded: refundedCount })
}
