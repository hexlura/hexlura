import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { notifyAdmins } from '@/lib/notify-admins'

/**
 * Refund a PaymentIntent AND take the organiser's share back.
 *
 * On a destination charge Stripe has already transferred the ticket money to the
 * organiser. A bare `refunds.create` pays the buyer back out of Hexlura's balance and
 * leaves the organiser with the money (Stripe's documented default), so Hexlura ends up
 * funding the refund. Stripe's own `reverse_transfer` flag is not used because it reverses
 * in proportion to the WHOLE charge (fees included), which under-recovers whenever only
 * the ticket price is refunded and the booking fee is kept. Instead we reverse the exact
 * amount, with an idempotency key so a retry can't reverse twice.
 *
 * Order matters: the buyer's refund is the irreversible step, so it goes first. If it
 * throws, nothing else has happened and the caller keeps its "leave the booking as it was"
 * behaviour. If only the reversal fails the buyer is already refunded — we do NOT throw
 * (that would make the caller treat a done refund as failed); we alert admins and return
 * `reversalError` so it can be recovered by hand.
 *
 * Direct charges (`stripeOptions.stripeAccount` set) are refunded on the connected account
 * and need no reversal. Plain platform charges have no transfer, so nothing is reversed.
 */
export interface RefundPaymentParams {
    paymentIntentId: string
    /** Pence to refund to the buyer. Omit to refund the whole charge. */
    amountPence?: number
    /**
     * Ticket money (subtotal minus discount) of the booking. With a partial `amountPence`
     * the organiser's share is reversed pro rata against this; omit it for a full refund.
     */
    ticketNetPence?: number
    /** Set for direct charges: the connected account the PaymentIntent lives on. */
    stripeOptions?: Stripe.RequestOptions
    /** For the admin alert only. */
    bookingRef?: string
}

export interface RefundPaymentResult {
    refund: Stripe.Refund
    reversedPence: number
    reversalError: string | null
}

export async function refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const { paymentIntentId, amountPence, ticketNetPence, stripeOptions, bookingRef } = params
    const stripe = getStripe()

    // Find the transfer (if any) BEFORE refunding, so a Stripe outage here stops the whole
    // refund instead of silently refunding without being able to recover the organiser's share.
    let transfer: Stripe.Transfer | null = null
    if (!stripeOptions?.stripeAccount) {
        try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.transfer'] })
            const charge = typeof pi.latest_charge === 'object' && pi.latest_charge ? pi.latest_charge : null
            if (charge && typeof charge.transfer === 'object' && charge.transfer) transfer = charge.transfer
        } catch (err) {
            // A direct charge lives on the organiser's account, so the platform can't see it:
            // carry on so the refund call below fails exactly as it did before this helper.
            if ((err as { code?: string }).code !== 'resource_missing') throw err
        }
    }

    const refund = await stripe.refunds.create(
        { payment_intent: paymentIntentId, ...(amountPence !== undefined ? { amount: amountPence } : {}) },
        stripeOptions,
    )

    if (!transfer) return { refund, reversedPence: 0, reversalError: null }

    const remaining = transfer.amount - (transfer.amount_reversed ?? 0)
    const isFullRefund = amountPence === undefined || !ticketNetPence || amountPence >= ticketNetPence
    const wanted = isFullRefund
        ? remaining
        : Math.min(remaining, Math.round((transfer.amount * (amountPence as number)) / ticketNetPence!))

    if (wanted <= 0) return { refund, reversedPence: 0, reversalError: null }

    try {
        await stripe.transfers.createReversal(
            transfer.id,
            { amount: wanted, metadata: { refund_id: refund.id, booking_ref: bookingRef ?? '' } },
            { idempotencyKey: `refund-reversal-${refund.id}` },
        )
        return { refund, reversedPence: wanted, reversalError: null }
    } catch (err) {
        const reversalError = err instanceof Error ? err.message : 'Transfer reversal failed'
        console.error(`Refund ${refund.id} done but transfer reversal failed:`, err)
        try {
            await notifyAdmins({
                type: 'refund_failed',
                title: 'Refund sent — organiser money NOT recovered',
                body: `Booking ${bookingRef ?? paymentIntentId}: the buyer was refunded (${refund.id}) but taking £${(wanted / 100).toFixed(2)} back from the organiser (transfer ${transfer.id}) failed: ${reversalError}. Reverse the transfer in Stripe by hand.`,
                link: '/admin/refunds',
            })
        } catch (notifyErr) {
            console.error('Failed to notify admins about the failed transfer reversal:', notifyErr)
        }
        return { refund, reversedPence: 0, reversalError }
    }
}
