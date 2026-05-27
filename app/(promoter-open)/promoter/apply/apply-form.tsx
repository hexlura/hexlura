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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Display name</label>
                <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="DJ Azeer"
                    minLength={2}
                    maxLength={50}
                    required
                    className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                />
                <p className="text-xs text-muted mt-1">Used to generate your referral code (e.g. DJAZEER).</p>
            </div>

            <div>
                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Short bio <span className="text-muted/60 normal-case tracking-normal">(optional)</span></label>
                <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="A line about who you are and what you promote."
                    rows={3}
                    maxLength={300}
                    className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none"
                />
            </div>

            {error && (
                <p className="text-sm text-accent bg-accent/10 border border-accent/30 px-3 py-2 rounded-sm">{error}</p>
            )}

            <button
                type="submit"
                disabled={submitting || displayName.trim().length < 2}
                className="bg-accent text-white font-bold uppercase tracking-wider text-sm py-3 px-6 hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
                {submitting ? 'Setting you up…' : 'Become a Promoter'}
            </button>

            <p className="text-xs text-muted text-center">
                By continuing you agree to the Hexlura{' '}
                <a href="/terms" className="text-accent hover:underline">Terms of Service</a>.
            </p>
        </form>
    )
}
