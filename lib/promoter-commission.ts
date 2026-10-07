/**
 * Promoter commission is withheld from the organiser's ticket money — it is NOT paid out of
 * Hexlura's own booking/processing fees. For a sale made through a promoter's link:
 *
 *   organiser receives = ticket subtotal − promo discount − promoter commission
 *
 * Rollout switch: the PROMOTER_DEDUCTION_START env var (an ISO timestamp, e.g.
 * 2026-10-10T09:00:00Z). Only bookings made at/after it are deducted; earlier bookings were
 * already paid to the organiser in full and must never be reopened. If the var is unset or
 * unparseable the feature is OFF, i.e. behaviour is exactly as before. Once set, do not move it:
 * checkout (Stripe) and payout generation (DB) both read it and must agree on which side of the
 * line a booking sits.
 */

function deductionStartMs(): number | null {
    const raw = process.env.PROMOTER_DEDUCTION_START
    if (!raw) return null
    const ms = Date.parse(raw)
    return Number.isNaN(ms) ? null : ms
}

/** True when a booking made at `at` (default: now) has its promoter commission deducted. */
export function isDeductionActive(at: Date | string | number = Date.now()): boolean {
    const start = deductionStartMs()
    if (start === null) return false
    const ms = new Date(at).getTime()
    return !Number.isNaN(ms) && ms >= start
}

export interface CommissionBookingFields {
    promoter_id?: string | null
    promoter_commission_pence?: number | null
    confirmed_at?: string | null
    created_at?: string | null
}

/** Commission withheld from the organiser for one booking (0 when not applicable). */
export function commissionWithheldPence(b: CommissionBookingFields): number {
    if (!b.promoter_id) return 0
    const commission = b.promoter_commission_pence ?? 0
    if (commission <= 0) return 0
    const at = b.confirmed_at ?? b.created_at
    if (!at || !isDeductionActive(at)) return 0
    return commission
}

/** What the organiser is actually owed for one booking, after discount and promoter commission. */
export function organiserOwedPence(
    b: CommissionBookingFields & { ticket_subtotal_pence?: number | null; discount_pence?: number | null }
): number {
    const ticketNet = (b.ticket_subtotal_pence ?? 0) - (b.discount_pence ?? 0)
    return Math.max(0, ticketNet - commissionWithheldPence(b))
}
