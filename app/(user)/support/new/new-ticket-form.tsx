'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { SUPPORT_CATEGORIES, type SupportCategory } from '@/lib/support'

export function NewTicketForm({ basePath = '/support' }: { basePath?: string }) {
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
        <form onSubmit={handleSubmit} className="bg-card border border-border p-6 space-y-5">
            <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Subject</label>
                <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder="Briefly describe the issue"
                    className="w-full bg-background border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
                    required
                />
            </div>

            <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Category</label>
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value as SupportCategory)}
                    className="w-full bg-background border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
                >
                    {SUPPORT_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Message</label>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={5000}
                    rows={8}
                    placeholder="Share as much detail as you can — what you were trying to do, what happened, any error messages."
                    className="w-full bg-background border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-y"
                    required
                />
                <p className="text-xs text-muted mt-1">{message.length} / 5000</p>
            </div>

            {error && <p className="text-xs text-accent">{error}</p>}

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Sending…' : 'Submit ticket'}
                </button>
                <Link href={basePath} className="text-sm text-muted hover:text-text transition-colors">
                    Cancel
                </Link>
            </div>
        </form>
    )
}
