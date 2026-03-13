'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = [
    'Changed plans',
    'Duplicate booking',
    'Event cancelled by organiser',
    'Other',
]

export default function RefundButton({ bookingId }: { bookingId: string }) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

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
            <div className="h-11 px-6 rounded-lg border border-success/30 bg-success/10 text-success text-sm font-medium flex items-center justify-center">
                Request submitted — organiser will respond within 48 hours
            </div>
        )
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="h-11 px-6 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface/80 transition"
            >
                Request Refund
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-heading text-2xl text-text">REQUEST REFUND</h3>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Reason</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
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
                                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                            />
                            <span className="text-xs text-muted text-right">{message.length}/500</span>
                        </div>

                        {error && (
                            <p className="text-sm text-accent">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 h-11 rounded-lg border border-border text-text text-sm font-medium hover:bg-card transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 h-11 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition disabled:opacity-50"
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
