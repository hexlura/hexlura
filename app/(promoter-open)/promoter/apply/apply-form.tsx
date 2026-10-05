'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    defaultName: string
}

export function ApplyForm({ defaultName }: Props) {
    const router = useRouter()
    const [displayName, setDisplayName] = useState(defaultName)
    const [bio, setBio] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        const res = await fetch('/api/promoter/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: displayName.trim(), bio: bio.trim() || undefined }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setError(json.error || 'Something went wrong — try again.')
            setSubmitting(false)
            return
        }
        router.push('/promoter')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Display name</label>
                <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="DJ Azeer"
                    minLength={2}
                    maxLength={50}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
                <p className="text-xs text-muted mt-1.5">Used to generate your referral code (e.g. DJAZEER).</p>
            </div>

            <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Short bio <span className="font-normal">(optional)</span></label>
                <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="A line about who you are and what you promote."
                    rows={3}
                    maxLength={300}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25 resize-none"
                />
            </div>

            {error && (
                <p className="text-sm text-accent bg-accent/10 rounded-lg px-3.5 py-2.5">{error}</p>
            )}

            <button
                type="submit"
                disabled={submitting || displayName.trim().length < 2}
                className="w-full py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
            >
                {submitting ? 'Setting you up…' : 'Become a Promoter'}
            </button>

            <p className="text-xs text-muted text-center">
                By continuing you agree to the Hexlura{' '}
                <a href="/terms" className="text-accent font-semibold hover:underline">Terms of Service</a>.
            </p>
        </form>
    )
}
