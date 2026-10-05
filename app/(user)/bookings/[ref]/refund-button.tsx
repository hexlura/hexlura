'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import { isRefundWindowOpen } from '@/lib/refund-policy'

const REASONS = [
    'Changed plans',
    'Duplicate booking',
    'Event cancelled by organiser',
    'Other',
]

interface EligibilityState {
    eligible: boolean
    ineligibleReason: string
    refundAmountPence: number
    bookingFeePence: number
}

export default function RefundButton({ bookingId }: { bookingId: string }) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')
    const [eligibility, setEligibility] = useState<EligibilityState | null>(null)

    useEffect(() => {
        async function checkEligibility() {
            const supabase = createClient()
            const { data } = await supabase
                .from('bookings')
                .select('ticket_subtotal_pence, discount_pence, booking_fee_pence, order_processing_fee_pence, event:events(start_at, refund_policy), items:booking_items(checkins(id))')
                .eq('id', bookingId)
                .single()

            if (!data) return

            const now = new Date()
            const event = data.event as unknown as { start_at: string; refund_policy: string | null } | null
            if (!event) return

            const eventDate = new Date(event.start_at)
            const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            const items = data.items as unknown as { checkins: { id: string }[] }[] | null
            const alreadyCheckedIn = (items ?? []).some(i => i.checkins && i.checkins.length > 0)
            const refundPolicy = event.refund_policy
            // Net of any promo-code discount — only what was actually paid for tickets
            // is refundable, not the pre-discount face value.
            const ticketSubtotal = (data.ticket_subtotal_pence ?? 0) - (data.discount_pence ?? 0)
            // One combined figure for buyers — no booking/processing split
            const bookingFee = (data.booking_fee_pence ?? 0) + (data.order_processing_fee_pence ?? 0)

            let eligible = false
            let ineligibleReason = ''

            if (alreadyCheckedIn) {
                ineligibleReason = 'This ticket has already been used'
            } else if (!isRefundWindowOpen(refundPolicy, hoursUntilEvent)) {
                ineligibleReason = refundPolicy === 'Refunds up to 48 hours before event'
                    ? 'Refund window has closed (48 hours before event)'
                    : refundPolicy === 'Refunds up to 7 days before event'
                        ? 'Refund window has closed (7 days before event)'
                        : 'This event does not offer refunds'
            } else if (now > eventDate) {
                ineligibleReason = 'Event has already taken place'
            } else if (ticketSubtotal === 0) {
                ineligibleReason = 'No refund applicable — this was a free ticket'
            } else {
                eligible = true
            }

            setEligibility({
                eligible,
                ineligibleReason,
                refundAmountPence: ticketSubtotal,
                bookingFeePence: bookingFee,
            })
        }

        checkEligibility()
    }, [bookingId])

    async function handleSubmit() {
        if (!reason) {
            setError('Please select a reason.')
            return
        }

        setLoading(true)
        setError('')

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Not authenticated.')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('refund_requests')
            .insert({
                booking_id: bookingId,
                user_id: user.id,
                reason,
                message: message.trim() || null,
                refund_amount_pence: eligibility?.refundAmountPence ?? null,
            })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        setSubmitted(true)
        setLoading(false)
    }

    if (submitted) {
        return (
            <div className="px-5 py-2.5 rounded-full bg-success/10 text-success text-sm font-semibold text-center">
                Request submitted — organiser will respond within 48 hours
            </div>
        )
    }

    // Not yet loaded
    if (!eligibility) {
        return (
            <button
                disabled
                className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold opacity-40 cursor-not-allowed"
            >
                Request Refund
            </button>
        )
    }

    // Ineligible
    if (!eligibility.eligible) {
        return (
            <div>
                <button
                    disabled
                    className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold opacity-40 cursor-not-allowed"
                >
                    Refund Not Available
                </button>
                <p className="text-xs text-muted mt-1.5">{eligibility.ineligibleReason}</p>
            </div>
        )
    }

    return (
        <>
            <div>
                <button
                    onClick={() => setOpen(true)}
                    className="px-5 py-2.5 rounded-full border border-accent text-accent text-sm font-semibold hover:bg-accent/10 transition"
                >
                    Request Refund
                </button>
                {eligibility.refundAmountPence > 0 && (
                    <p className="text-xs text-muted mt-1.5">
                        Refund amount: {formatPence(eligibility.refundAmountPence)}
                        {eligibility.bookingFeePence > 0 && ` (fees of ${formatPence(eligibility.bookingFeePence)} are non-refundable)`}
                    </p>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-card rounded-2xl shadow-hover p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-heading text-2xl tracking-wide">REQUEST REFUND</h3>

                        {eligibility.refundAmountPence > 0 && (
                            <div className="bg-success/10 rounded-xl px-3.5 py-2.5">
                                <p className="text-sm font-semibold text-success">
                                    Refund amount: {formatPence(eligibility.refundAmountPence)}
                                </p>
                                {eligibility.bookingFeePence > 0 && (
                                    <p className="text-xs text-muted mt-0.5">
                                        Fees of {formatPence(eligibility.bookingFeePence)} are non-refundable
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-muted mb-1.5 block">Reason</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/25"
                            >
                                <option value="">Select a reason...</option>
                                {REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-muted mb-1.5 block">Message (optional)</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                maxLength={500}
                                rows={3}
                                placeholder="Any additional details..."
                                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25 resize-none"
                            />
                            <span className="text-xs text-muted text-right">{message.length}/500</span>
                        </div>

                        {error && (
                            <p className="text-sm font-semibold text-accent">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-background transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-2.5 rounded-full bg-accent text-white text-sm font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
