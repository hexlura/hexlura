'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    token: string
    isPromoter: boolean
    alreadyAccepted: boolean
    orgName: string
    eventName: string
    eventDate: string
    commissionPercent: number
}

function fmt(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function AcceptClient({ token, isPromoter, alreadyAccepted, orgName, eventName, eventDate, commissionPercent }: Props) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleAccept() {
        setError(null)
        setSubmitting(true)
        const res = await fetch('/api/promoter/invite/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
        const json = await res.json().catch(() => ({}))
        setSubmitting(false)
        if (!res.ok) {
            setError(json.error || 'Failed to accept invite')
            return
        }
        router.push('/promoter/links')
        router.refresh()
    }

    if (alreadyAccepted) {
        return (
            <>
                <p className="text-sm font-semibold text-warm-green mb-5">You&apos;ve already accepted this invitation.</p>
                <a href="/promoter/links" className="block w-full py-3.5 rounded-full bg-accent text-white font-semibold text-center shadow-glow hover:brightness-110 transition">
                    Open My Links →
                </a>
            </>
        )
    }

    return (
        <>
            <p className="text-sm text-muted leading-relaxed mb-6">
                <strong className="text-text">{orgName}</strong> has invited you to promote{' '}
                <strong className="text-text">{eventName}</strong>{eventDate ? ` on ${fmt(eventDate)}` : ''}.
            </p>

            <div className="rounded-2xl border border-border bg-background p-5 text-center mb-6">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Commission</p>
                <p className="font-heading text-5xl text-warm-green">{commissionPercent}%</p>
                <p className="text-xs text-muted mt-1">of each ticket sold via your link</p>
            </div>

            {!isPromoter && (
                <p className="text-xs text-muted mb-4">
                    You&apos;ll need a free promoter account to accept. <a href={`/promoter/apply`} className="text-accent font-semibold hover:underline">Sign up</a>, then come back to this page.
                </p>
            )}

            {error && <p className="text-sm text-accent bg-warm-red/10 rounded-lg px-3.5 py-2.5 mb-4">{error}</p>}

            <button
                onClick={handleAccept}
                disabled={submitting || !isPromoter}
                className="w-full py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
            >
                {submitting ? 'Accepting…' : isPromoter ? 'Accept invitation' : 'Sign up first to accept'}
            </button>
        </>
    )
}
