'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ThemedSelect } from '@/components/ui/ThemedSelect'
import { SUPPORT_CATEGORIES, type SupportCategory } from '@/lib/support'

const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25'
const labelClass = 'text-xs font-semibold text-muted mb-1.5 block'

// Customer version of the new-ticket form. The original new-ticket-form.tsx is
// still used by the promoter portal and is left untouched.
export function UserNewTicketForm({ basePath = '/support' }: { basePath?: string }) {
    const router = useRouter()
    const [subject, setSubject] = useState('')
    const [category, setCategory] = useState<SupportCategory>('general')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (subject.trim().length < 3) {
            setError('Subject must be at least 3 characters')
            return
        }
        if (message.trim().length < 1) {
            setError('Message cannot be empty')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject.trim(),
                    category,
                    message: message.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Failed to create ticket')
                setSubmitting(false)
                return
            }
            router.push(`${basePath}/${data.id}`)
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-soft p-6">
            <div className="mb-4">
                <label className={labelClass}>Category</label>
                <ThemedSelect value={category} onChange={e => setCategory(e.target.value as SupportCategory)} className="w-full">
                    {SUPPORT_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </ThemedSelect>
            </div>

            <div className="mb-4">
                <label className={labelClass}>Subject</label>
                <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder="Brief summary of your issue"
                    className={fieldClass}
                    required
                />
            </div>

            <div className="mb-5">
                <label className={labelClass}>Message</label>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    placeholder="Describe your issue in detail — what you were trying to do, what happened, any error messages."
                    className={`${fieldClass} resize-none`}
                    required
                />
                <p className="text-xs text-muted mt-1 text-right">{message.length} / 5000</p>
            </div>

            {error && <p className="text-sm font-semibold text-accent bg-accent/10 rounded-lg px-3.5 py-2.5 mb-4">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none"
            >
                {submitting ? 'Sending…' : 'Submit Ticket'}
            </button>
        </form>
    )
}
