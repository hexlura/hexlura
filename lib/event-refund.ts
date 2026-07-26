import { createAdminClient } from '@/lib/supabase/admin'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { sendEventCancelledEmail } from '@/lib/email'

interface RefundResult {
    refundedCount: number
    totalRefundedPence: number
}

// Refunds every confirmed booking for an event via Stripe, marks them
// refunded, reverses any promoter commission, notifies attendees in-app and
// by email. Shared by the admin "cancel event" action and the event/account
// deletion-approval flows, which both need to make ticket-holders whole
// before the event (or organiser) disappears.
export async function refundAllBookingsForEvent(eventId: string): Promise<RefundResult> {
    const adminClient = createAdminClient()

    const { data: event } = await adminClient
        .from('events')
        .select('title, start_at')
        .eq('id', eventId)
        .single()

    const { data: bookings } = await adminClient
        .from('bookings')
        .select('id, user_id, total_pence, stripe_payment_intent_id')
        .eq('event_id', eventId)
        .eq('status', 'confirmed')

    let refundedCount = 0
    let totalRefundedPence = 0

    for (const booking of (bookings || []) as { id: string; user_id: string | null; total_pence: number | null; stripe_payment_intent_id: string | null }[]) {
        if (booking.stripe_payment_intent_id) {
            try {
                const stripe = (await import('stripe')).default
                const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
                await stripeClient.refunds.create({ payment_intent: booking.stripe_payment_intent_id })
            } catch {
                // Continue even if Stripe refund fails — booking is still marked refunded below
            }
        }
        await adminClient.from('bookings').update({ status: 'refunded' }).eq('id', booking.id)
        await adminClient.from('booking_items').update({ status: 'cancelled' }).eq('booking_id', booking.id)
        await reversePromoterEarningsForBooking(booking.id)

        if (booking.user_id) {
            void adminClient.from('notifications').insert({
                user_id: booking.user_id,
                type: 'event_cancelled',
                title: 'Event cancelled',
                body: `${event?.title ?? 'An event'} has been cancelled. If you paid, a full refund is on its way.`,
                link: '/bookings',
            })
        }

        refundedCount++
        totalRefundedPence += booking.total_pence || 0
    }

    try {
        const { data: allItems } = await adminClient
            .from('booking_items')
            .select('attendee_email')
            .in('booking_id', (bookings || []).map(b => b.id))

        const emails = Array.from(new Set((allItems || []).map(i => i.attendee_email).filter(Boolean))) as string[]
        const hasPaidTickets = (bookings || []).some(b => (b.total_pence || 0) > 0)
        const eventDate = event?.start_at
            ? new Date(event.start_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })
            : ''

        if (emails.length) {
            await sendEventCancelledEmail({
                emails,
                eventTitle: event?.title ?? 'Your event',
                eventDate,
                hasPaidTickets,
            })
        }
    } catch (err) {
        console.error('Failed to send cancellation emails:', err)
    }

    return { refundedCount, totalRefundedPence }
}
