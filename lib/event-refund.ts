import { createAdminClient } from '@/lib/supabase/admin'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { sendEventCancelledEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'

interface RefundResult {
    refundedCount: number
    totalRefundedPence: number
    failedBookingRefs: string[]
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
        .select('id, booking_ref, user_id, total_pence, stripe_payment_intent_id')
        .eq('event_id', eventId)
        .eq('status', 'confirmed')

    let refundedCount = 0
    let totalRefundedPence = 0
    const failedBookingRefs: string[] = []

    for (const booking of (bookings || []) as { id: string; booking_ref: string; user_id: string | null; total_pence: number | null; stripe_payment_intent_id: string | null }[]) {
        // A failed Stripe refund must not fall through to marking the booking
        // refunded and telling the buyer their money is on its way — that
        // voids their tickets for a refund that never happened. Skip this
        // booking (leave it 'confirmed') and keep processing the rest so one
        // failure doesn't stall refunding everyone else.
        if (booking.stripe_payment_intent_id) {
            try {
                const stripe = (await import('stripe')).default
                const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
                await stripeClient.refunds.create({ payment_intent: booking.stripe_payment_intent_id })
            } catch (err) {
                console.error(`Stripe refund failed for booking ${booking.booking_ref}:`, err)
                failedBookingRefs.push(booking.booking_ref)
                continue
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

    if (failedBookingRefs.length) {
        await notifyAdmins({
            type: 'refund_failed',
            title: 'Some refunds failed during event cancellation',
            body: `${failedBookingRefs.length} booking(s) for ${event?.title ?? 'this event'} could not be refunded via Stripe and were left as confirmed: ${failedBookingRefs.join(', ')}. Refund these manually.`,
            link: '/admin/bookings',
        })
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

    return { refundedCount, totalRefundedPence, failedBookingRefs }
}
