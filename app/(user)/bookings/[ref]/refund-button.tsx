'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'

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
                .select('ticket_subtotal_pence, booking_fee_pence, event:events(start_at, refund_policy), items:booking_items(checkins(id))')
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
            const ticketSubtotal = data.ticket_subtotal_pence ?? 0
            const bookingFee = data.booking_fee_pence ?? 0

            let eligible = false
            let ineligibleReason = ''

            if (alreadyCheckedIn) {
                ineligibleReason = 'This ticket has already been used'
            } else if (refundPolicy === 'no_refunds') {
                ineligibleReason = 'This event does not offer refunds'
            } else if (refundPolicy === '48_hours' && hoursUntilEvent < 48) {
                ineligibleReason = 'Refund window has closed (48 hours before event)'
            } else if (refundPolicy === '7_days' && hoursUntilEvent < 168) {
                ineligibleReason = 'Refund window has closed (7 days before event)'
            } else if (now > eventDate) {
                ineligibleReason = 'Event has already taken place'
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
            <div className="h-11 px-6 rounded-sm border border-success/30 bg-success/10 text-success text-sm font-medium flex items-center justify-center">
                Request submitted — organiser will respond within 48 hours
            </div>
        )
    }

    // Not yet loaded
    if (!eligibility) {
        return (
            <button
                disabled
                className="h-11 px-6 rounded-sm border border-border bg-surface text-text text-sm font-medium opacity-40 cursor-not-allowed"
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
                    style={{ opacity: 0.4, cursor: 'not-allowed' }}
                    className="h-11 px-6 rounded-sm border border-border bg-surface text-text text-sm font-medium w-full"
                >
                    Refund Not Available
                </button>
                <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '6px' }}>{eligibility.ineligibleReason}</p>
            </div>
        )
    }

    return (
        <>
            <div>
                <button
                    onClick={() => setOpen(true)}
                    className="h-11 px-6 rounded-sm border border-border bg-surface text-text text-sm font-medium hover:bg-surface/80 transition w-full"
                >
                    Request Refund
                </button>
                {eligibility.refundAmountPence > 0 && (
                    <p style={{ fontSize: '12px', color: '#8888AA', marginTop: '6px' }}>
                        Refund amount: {formatPence(eligibility.refundAmountPence)}
                        {eligibility.bookingFeePence > 0 && ` (booking fee of ${formatPence(eligibility.bookingFeePence)} is non-refundable)`}
                    </p>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-surface border border-border rounded-none p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-heading text-2xl text-text">REQUEST REFUND</h3>

                        {eligibility.refundAmountPence > 0 && (
                            <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.2)', padding: '10px 14px', borderRadius: '2px' }}>
                                <p style={{ fontSize: '13px', color: '#00E5A0', fontWeight: 600 }}>
                                    Refund amount: {formatPence(eligibility.refundAmountPence)}
                                </p>
                                {eligibility.bookingFeePence > 0 && (
                                    <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '3px' }}>
                                        Booking fee of {formatPence(eligibility.bookingFeePence)} is non-refundable
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Reason</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-11 w-full rounded-sm border border-border bg-card px-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                <option value="">Select a reason...</option>
                                {REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Message (optional)</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                maxLength={500}
                                rows={3}
                                placeholder="Any additional details..."
                                className="w-full rounded-sm border border-border bg-card px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                            />
                            <span className="text-xs text-muted text-right">{message.length}/500</span>
                        </div>

                        {error && (
                            <p className="text-sm text-accent">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 h-11 rounded-sm border border-border text-text text-sm font-medium hover:bg-card transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 h-11 rounded-sm bg-[#0A0A0F] text-white text-sm font-semibold hover:bg-[#2a2a3f] transition disabled:opacity-50"
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
