'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Customer version of the reply box. The original reply-form.tsx is still used
// by the promoter portal and is left untouched.
export function UserReplyForm({ ticketId }: { ticketId: string }) {
    const router = useRouter()
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (message.trim().length < 1) {
            setError('Message cannot be empty')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Failed to send reply')
                setSubmitting(false)
                return
            }
            setMessage('')
            setSubmitting(false)
            router.refresh()
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-soft p-4">
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={5000}
                rows={3}
                placeholder="Type your reply…"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25 resize-none mb-3"
                required
            />
            {error && <p className="text-sm font-semibold text-accent mb-3">{error}</p>}
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">{message.length} / 5000</p>
                <button
                    type="submit"
                    disabled={submitting || message.trim().length === 0}
                    className="px-6 py-2.5 rounded-full bg-accent text-white text-sm font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none"
                >
                    {submitting ? 'Sending…' : 'Send Reply'}
                </button>
            </div>
        </form>
    )
}
