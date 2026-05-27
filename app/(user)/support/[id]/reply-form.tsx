'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ReplyForm({ ticketId }: { ticketId: string }) {
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
        <form onSubmit={handleSubmit} className="bg-card border border-border p-4 space-y-3">
            <label className="block text-xs text-muted uppercase tracking-wider">Reply</label>
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Type your message…"
                className="w-full bg-background border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-y"
                required
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">{message.length} / 5000</p>
                <button
                    type="submit"
                    disabled={submitting || message.trim().length === 0}
                    className="px-4 py-2 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Sending…' : 'Send reply'}
                </button>
            </div>
            {error && <p className="text-xs text-accent">{error}</p>}
        </form>
    )
}
