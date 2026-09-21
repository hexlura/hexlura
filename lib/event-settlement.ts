import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

/**
 * Read-only settlement report for one event: every confirmed booking, how its
 * money was actually routed in Stripe, and what the organiser has / hasn't been
 * paid. Admin-only — it exposes platform fees and Stripe IDs.
 *
 * Routing is read from Stripe, not inferred from `needs_manual_payout`, so the
 * report can catch the two costly disagreements between them:
 *   - flagged manual, but Stripe already sent the money  → paying again double-pays
 *   - flagged settled, but Stripe shows no transfer      → organiser is short
 */

export type SettlementRoute = 'destination' | 'transfer' | 'direct' | 'platform' | 'free' | 'unknown'

export interface SettlementBooking {
    id: string
    ref: string
    createdAt: string
    needsManualPayout: boolean
    ticketPence: number // ticket subtotal net of any promo discount — what the organiser is owed
    bookingFeePence: number
    processingFeePence: number
    totalPence: number // what the buyer paid
    paymentIntentId: string | null
    chargeId: string | null
    transferIds: string[]
    route: SettlementRoute
    transferredPence: number | null // gross amount moved to the connected account
    appFeePence: number | null
    receivedPence: number | null // what the organiser actually ended up with
    chargeStatus: string | null
    refundedPence: number
    stripeError: string | null
}

export interface SettlementPayout {
    id: string
    status: string
    netPence: number
    reference: string | null
    createdAt: string
    requestedAt: string | null
    paidAt: string | null
    stripeTransferId: string | null
}

export interface SettlementIssue {
    severity: 'error' | 'warn'
    message: string
    bookingRef?: string
}

export interface EventSettlement {
    event: { id: string; title: string; slug: string; status: string; startAt: string; endAt: string | null }
    organiser: {
        id: string
        name: string
        payoutMethod: string | null
        stripeAccountId: string | null
        connectAllowed: boolean
        identityStatus: string | null
    }
    settled: SettlementBooking[] // needs_manual_payout = false — funds already sent via Connect
    held: SettlementBooking[] // needs_manual_payout = true — funds still with the platform
    payouts: SettlementPayout[]
    totals: {
        buyersPaidPence: number
        owedPence: number
        receivedPence: number
        duePence: number
        bookingFeesPence: number
        processingFeesPence: number
    }
    ticketCount: number | null
    excluded: { status: string; count: number }[] // bookings not counted (cancelled, refunded, …)
    issues: SettlementIssue[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: string) => UUID_RE.test(v)

type BookingRow = {
    id: string
    booking_ref: string
    status: string
    needs_manual_payout: boolean | null
    ticket_subtotal_pence: number | null
    discount_pence: number | null
    booking_fee_pence: number | null
    order_processing_fee_pence: number | null
    total_pence: number | null
    stripe_payment_intent_id: string | null
    created_at: string
}

type StripeInfo = Pick<
    SettlementBooking,
    'chargeId' | 'transferIds' | 'route' | 'transferredPence' | 'appFeePence' | 'receivedPence' | 'chargeStatus' | 'refundedPence' | 'stripeError'
>

const EMPTY_STRIPE: StripeInfo = {
    chargeId: null,
    transferIds: [],
    route: 'unknown',
    transferredPence: null,
    appFeePence: null,
    receivedPence: null,
    chargeStatus: null,
    refundedPence: 0,
    stripeError: null,
}

/** Look up how one booking's money moved. Never throws — failures land in `stripeError`. */
async function lookupStripe(paymentIntentId: string, bookingRef: string, connectAccountId: string | null): Promise<StripeInfo> {
    const stripe = getStripe()
    try {
        let pi: Stripe.PaymentIntent
        let onConnectedAccount = false
        try {
            pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.transfer'] })
        } catch (err) {
            // Direct charges live on the connected account, not the platform.
            const code = (err as { code?: string }).code
            if (code === 'resource_missing' && connectAccountId) {
                pi = await stripe.paymentIntents.retrieve(
                    paymentIntentId,
                    { expand: ['latest_charge'] },
                    { stripeAccount: connectAccountId },
                )
                onConnectedAccount = true
            } else {
                throw err
            }
        }

        const charge = typeof pi.latest_charge === 'object' && pi.latest_charge ? pi.latest_charge : null
        const appFee = pi.application_fee_amount ?? 0

        // Transfers: the destination-charge transfer hangs off the charge; a
        // separate per-booking transfer (webhook fallback) is grouped by booking ref.
        const transfers = new Map<string, Stripe.Transfer>()
        let destinationTransferId: string | null = null
        if (!onConnectedAccount) {
            if (charge && typeof charge.transfer === 'object' && charge.transfer) {
                transfers.set(charge.transfer.id, charge.transfer)
                destinationTransferId = charge.transfer.id
            }
            const grouped = await stripe.transfers.list({ transfer_group: bookingRef, limit: 10 })
            for (const t of grouped.data) transfers.set(t.id, t)
        }

        const transferList = Array.from(transfers.values())
        const net = (t: Stripe.Transfer) => t.amount - (t.amount_reversed ?? 0)

        let route: SettlementRoute = 'platform'
        let receivedPence = 0
        if (onConnectedAccount) {
            route = 'direct'
            receivedPence = (charge?.amount ?? pi.amount) - (charge?.amount_refunded ?? 0) - appFee
        } else if (destinationTransferId) {
            route = 'destination'
            receivedPence = transferList.reduce((sum, t) => sum + net(t), 0) - appFee
        } else if (transferList.length > 0) {
            route = 'transfer'
            receivedPence = transferList.reduce((sum, t) => sum + net(t), 0)
        }

        return {
            chargeId: charge?.id ?? (typeof pi.latest_charge === 'string' ? pi.latest_charge : null),
            transferIds: transferList.map(t => t.id),
            route,
            transferredPence: onConnectedAccount ? null : transferList.reduce((sum, t) => sum + t.amount, 0),
            appFeePence: route === 'destination' || route === 'direct' ? appFee : null,
            receivedPence,
            chargeStatus: charge?.status ?? null,
            refundedPence: charge?.amount_refunded ?? 0,
            stripeError: null,
        }
    } catch (err) {
        return { ...EMPTY_STRIPE, stripeError: err instanceof Error ? err.message : 'Unknown Stripe error' }
    }
}

async function mapInBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = []
    for (let i = 0; i < items.length; i += size) {
        out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
    }
    return out
}

/** Returns null when the event doesn't exist. Throws on any database error. */
export async function getEventSettlement(eventId: string): Promise<EventSettlement | null> {
    const admin = createAdminClient()

    const { data: event, error: eventError } = await admin
        .from('events')
        .select('id, title, slug, status, start_at, end_at, organiser_id')
        .eq('id', eventId)
        .maybeSingle()
    if (eventError) throw new Error(`Failed to load event: ${eventError.message}`)
    if (!event) return null

    const { data: organiser, error: orgError } = await admin
        .from('organiser_profiles')
        .select('id, org_name, payout_method, stripe_account_id, stripe_connect_allowed, identity_status')
        .eq('id', event.organiser_id)
        .maybeSingle()
    if (orgError) throw new Error(`Failed to load organiser: ${orgError.message}`)
    if (!organiser) throw new Error('Event has no organiser profile')

    const { data: bookingRows, error: bookingsError } = await admin
        .from('bookings')
        .select('id, booking_ref, status, needs_manual_payout, ticket_subtotal_pence, discount_pence, booking_fee_pence, order_processing_fee_pence, total_pence, stripe_payment_intent_id, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
    if (bookingsError) throw new Error(`Failed to load bookings: ${bookingsError.message}`)

    const { data: payoutRows, error: payoutsError } = await admin
        .from('payouts')
        .select('id, status, net_pence, reference, created_at, requested_at, paid_at, stripe_transfer_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
    if (payoutsError) throw new Error(`Failed to load payouts: ${payoutsError.message}`)

    const all = (bookingRows ?? []) as BookingRow[]
    const confirmed = all.filter(b => b.status === 'confirmed')

    const excludedCounts = new Map<string, number>()
    for (const b of all) {
        if (b.status !== 'confirmed') excludedCounts.set(b.status, (excludedCounts.get(b.status) ?? 0) + 1)
    }

    let ticketCount: number | null = null
    if (confirmed.length > 0) {
        const { count, error: itemsError } = await admin
            .from('booking_items')
            .select('id', { count: 'exact', head: true })
            .in('booking_id', confirmed.map(b => b.id))
        ticketCount = itemsError ? null : count
    }

    // Free / comp bookings never touch Stripe: no charge, and their "PaymentIntent"
    // is a placeholder like `free-<uuid>`. Don't ask Stripe about those.
    const isFree = (b: BookingRow) => (b.total_pence ?? 0) === 0 || !!b.stripe_payment_intent_id?.startsWith('free-')

    const stripeInfo = await mapInBatches(confirmed, 6, b => {
        if (isFree(b)) return Promise.resolve<StripeInfo>({ ...EMPTY_STRIPE, route: 'free', receivedPence: 0 })
        if (!b.stripe_payment_intent_id) return Promise.resolve(EMPTY_STRIPE)
        return lookupStripe(b.stripe_payment_intent_id, b.booking_ref, organiser.stripe_account_id)
    })

    const bookings: SettlementBooking[] = confirmed.map((b, i) => ({
        id: b.id,
        ref: b.booking_ref,
        createdAt: b.created_at,
        needsManualPayout: !!b.needs_manual_payout,
        ticketPence: (b.ticket_subtotal_pence ?? 0) - (b.discount_pence ?? 0),
        bookingFeePence: b.booking_fee_pence ?? 0,
        processingFeePence: b.order_processing_fee_pence ?? 0,
        totalPence: b.total_pence ?? 0,
        paymentIntentId: b.stripe_payment_intent_id,
        ...stripeInfo[i],
    }))

    const settled = bookings.filter(b => !b.needsManualPayout)
    const held = bookings.filter(b => b.needsManualPayout)
    const sum = (rows: SettlementBooking[], pick: (b: SettlementBooking) => number) => rows.reduce((s, b) => s + pick(b), 0)

    const payouts: SettlementPayout[] = (payoutRows ?? []).map(p => ({
        id: p.id,
        status: p.status,
        netPence: p.net_pence ?? 0,
        reference: p.reference,
        createdAt: p.created_at,
        requestedAt: p.requested_at,
        paidAt: p.paid_at,
        stripeTransferId: p.stripe_transfer_id,
    }))

    const totals = {
        buyersPaidPence: sum(bookings, b => b.totalPence),
        owedPence: sum(bookings, b => b.ticketPence),
        receivedPence: sum(settled, b => b.receivedPence ?? 0),
        duePence: sum(held, b => b.ticketPence),
        bookingFeesPence: sum(bookings, b => b.bookingFeePence),
        processingFeesPence: sum(bookings, b => b.processingFeePence),
    }

    // ── Integrity checks ─────────────────────────────────────────────
    const issues: SettlementIssue[] = []

    for (const b of bookings) {
        if (b.route === 'free') continue
        if (b.stripeError) {
            issues.push({ severity: 'warn', bookingRef: b.ref, message: `Stripe lookup failed: ${b.stripeError}` })
            continue
        }
        if (!b.paymentIntentId) {
            issues.push({ severity: 'warn', bookingRef: b.ref, message: 'No PaymentIntent recorded — cannot verify in Stripe.' })
            continue
        }
        if (b.needsManualPayout && (b.route === 'destination' || b.route === 'transfer' || b.route === 'direct')) {
            issues.push({
                severity: 'error',
                bookingRef: b.ref,
                message: `Flagged as needing a manual payout, but Stripe shows the money already reached the organiser (${b.route}). Processing it would pay twice.`,
            })
        }
        if (!b.needsManualPayout && (b.route === 'platform' || b.route === 'unknown')) {
            issues.push({
                severity: 'error',
                bookingRef: b.ref,
                message: 'Marked as settled via Connect, but Stripe shows no transfer to the organiser — they may be unpaid.',
            })
        }
        if (b.transferIds.length > 1) {
            issues.push({ severity: 'error', bookingRef: b.ref, message: `${b.transferIds.length} transfers found for one booking — possible double payment.` })
        }
        if (b.chargeStatus && b.chargeStatus !== 'succeeded') {
            issues.push({ severity: 'warn', bookingRef: b.ref, message: `Charge status is "${b.chargeStatus}", not succeeded.` })
        }
        if (b.refundedPence > 0) {
            issues.push({ severity: 'warn', bookingRef: b.ref, message: `${(b.refundedPence / 100).toFixed(2)} GBP refunded on this charge.` })
        }
        if (!b.needsManualPayout && b.receivedPence !== null && b.route !== 'platform' && b.receivedPence !== b.ticketPence) {
            issues.push({
                severity: 'warn',
                bookingRef: b.ref,
                message: `Organiser received ${(b.receivedPence / 100).toFixed(2)} GBP but the ticket price is ${(b.ticketPence / 100).toFixed(2)} GBP.`,
            })
        }
    }

    const activePayoutTotal = payouts.filter(p => p.status !== 'failed').reduce((s, p) => s + p.netPence, 0)
    if (payouts.length > 0 && activePayoutTotal !== totals.owedPence) {
        issues.push({
            severity: 'warn',
            message: `Payout rows total ${(activePayoutTotal / 100).toFixed(2)} GBP but confirmed ticket revenue is ${(totals.owedPence / 100).toFixed(2)} GBP.`,
        })
    }

    return {
        event: {
            id: event.id,
            title: event.title,
            slug: event.slug,
            status: event.status,
            startAt: event.start_at,
            endAt: event.end_at,
        },
        organiser: {
            id: organiser.id,
            name: organiser.org_name,
            payoutMethod: organiser.payout_method,
            stripeAccountId: organiser.stripe_account_id,
            connectAllowed: !!organiser.stripe_connect_allowed,
            identityStatus: organiser.identity_status,
        },
        settled,
        held,
        payouts,
        totals,
        ticketCount,
        excluded: Array.from(excludedCounts, ([status, count]) => ({ status, count })),
        issues,
    }
}
