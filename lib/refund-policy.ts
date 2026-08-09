// Single source of truth for event refund policies. `events.refund_policy`
// stores one of these exact sentences (not a code) — EventForm's dropdown,
// the public event page badge, and every refund-eligibility check must all
// key off the same literal strings, or eligibility silently stops matching
// (which is exactly what happened before this file existed: three separate
// copies drifted, and every eligibility check ended up matching nothing).
export const REFUND_POLICIES = [
    'No refunds',
    'Refunds up to 48 hours before event',
    'Refunds up to 7 days before event',
    'Full refunds always available',
] as const

export type RefundPolicy = (typeof REFUND_POLICIES)[number]

// Whether a refund can still be requested, given hours remaining until the
// event starts. Unrecognized/null policy values default to open rather than
// silently blocking — matches the pre-existing fallback behaviour.
export function isRefundWindowOpen(refundPolicy: string | null | undefined, hoursUntilEvent: number): boolean {
    if (refundPolicy === 'No refunds') return false
    if (refundPolicy === 'Refunds up to 48 hours before event') return hoursUntilEvent >= 48
    if (refundPolicy === 'Refunds up to 7 days before event') return hoursUntilEvent >= 168
    return true
}
