import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notify-admins'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { notifyWaitlistForEvent } from '@/lib/waitlist'

export type RefundSyncResult = 'ignored' | 'no_booking' | 'partial' | 'already_handled' | 'marked_refunded'

/**
 * Keeps a booking in step with a refund made in Stripe (e.g. from the Stripe dashboard).
 *
 * Without this, a refund made outside the app leaves the booking 'confirmed': its tickets still
 * scan at the door and its fees still count as revenue.
 *
 * - Fully refunded charge on a 'confirmed' booking -> booking becomes 'refunded'.
 * - Partial refund -> status is left alone and admins are told (that needs a human decision).
 * - Any booking that is not 'confirmed' is left alone: refunds made through the app already set
 *   their own status, so this is a no-op for them and safe to run any number of times.
 *
 * Throws on a database failure so the webhook can answer 500 and Stripe retries.
 */
export async function syncRefundedCharge(charge: Stripe.Charge): Promise<RefundSyncResult> {
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
    if (!paymentIntentId || !(charge.amount_refunded > 0)) return 'ignored'

    const supabase = createAdminClient()

    const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, booking_ref, status, event_id, total_pence')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()
    if (bookingErr) throw new Error(`refund sync: booking lookup failed: ${bookingErr.message}`)
    // Not one of ours (e.g. unrelated activity on a connected account).
    if (!booking) return 'no_booking'
    if (booking.status !== 'confirmed') return 'already_handled'

    const amountText = `£${(charge.amount_refunded / 100).toFixed(2)}`

    if (charge.amount_refunded < charge.amount) {
        await notifyAdmins({
            type: 'refund_partial_stripe',
            title: 'Partial refund made in Stripe — review booking',
            body: `Booking ${booking.booking_ref} was partially refunded in Stripe (${amountText} of £${(charge.amount / 100).toFixed(2)}). The booking is still "confirmed" and its tickets still work. Decide whether to cancel it.`,
            link: '/admin/bookings',
        })
        return 'partial'
    }

    // Conditional update: only the caller that actually flips confirmed -> refunded does the follow-up
    // work, so a retried or duplicate webhook can't reverse promoter earnings twice.
    const { data: flipped, error: updateErr } = await supabase
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('id', booking.id)
        .eq('status', 'confirmed')
        .select('id')
    if (updateErr) throw new Error(`refund sync: could not mark ${booking.booking_ref} refunded: ${updateErr.message}`)
    if (!flipped || flipped.length === 0) return 'already_handled'

    // Tickets are voided by the booking status alone (booking_items has no status column; the
    // door scanner rejects any ticket whose booking is 'refunded').
    await reversePromoterEarningsForBooking(booking.id)

    // Close any refund request still open for this booking.
    const { error: reqErr } = await supabase
        .from('refund_requests')
        .update({ status: 'admin_approved', resolved_at: new Date().toISOString() })
        .eq('booking_id', booking.id)
        .in('status', ['pending', 'organiser_approved'])
    if (reqErr) console.error(`refund sync: could not close refund request for ${booking.booking_ref}:`, reqErr.message)

    const { error: auditErr } = await supabase.from('audit_logs').insert({
        actor_id: null,
        action: 'stripe_refund_synced',
        entity_type: 'booking',
        entity_id: booking.id,
        metadata: { booking_ref: booking.booking_ref, charge_id: charge.id, refunded_pence: charge.amount_refunded },
    })
    if (auditErr) console.error('refund sync: audit log failed:', auditErr.message)

    await notifyAdmins({
        type: 'refund_synced',
        title: 'Booking marked refunded (refund made in Stripe)',
        body: `Booking ${booking.booking_ref} was fully refunded in Stripe (${amountText}), so it has been marked refunded and its tickets no longer scan.`,
        link: '/admin/bookings',
    })

    const { data: ev } = await supabase.from('events').select('title, slug').eq('id', booking.event_id).maybeSingle()
    if (ev) void notifyWaitlistForEvent(booking.event_id, ev.title, ev.slug)

    return 'marked_refunded'
}
