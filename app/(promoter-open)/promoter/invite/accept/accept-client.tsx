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
                <p className="text-sm text-success mb-4">You&apos;ve already accepted this invitation.</p>
                <a href="/promoter/links" className="inline-block bg-accent text-white font-bold uppercase tracking-wider text-sm py-3 px-6 hover:bg-accent/90">
                    Open My Links →
                </a>
            </>
        )
    }

    return (
        <>
            <p className="text-sm text-muted mb-6">
                <strong className="text-text">{orgName}</strong> has invited you to promote{' '}
                <strong className="text-text">{eventName}</strong>{eventDate ? ` on ${fmt(eventDate)}` : ''}.
            </p>

            <div className="bg-surface border border-border p-4 mb-6 text-center">
                <div className="text-xs uppercase tracking-wider text-muted mb-1">Commission</div>
                <div className="font-heading text-4xl text-success">{commissionPercent}%</div>
                <div className="text-xs text-muted mt-1">of each ticket sold via your link</div>
            </div>

            {!isPromoter && (
                <p className="text-xs text-muted mb-4">
                    You&apos;ll need a free promoter account to accept. <a href={`/promoter/apply`} className="text-accent hover:underline">Sign up</a>, then come back to this page.
                </p>
            )}

            {error && <p className="text-sm text-accent bg-accent/10 border border-accent/30 px-3 py-2 mb-4 rounded-sm">{error}</p>}

            <button
                onClick={handleAccept}
                disabled={submitting || !isPromoter}
                className="w-full bg-accent text-white font-bold uppercase tracking-wider text-sm py-3 px-6 hover:bg-accent/90 disabled:opacity-50"
            >
                {submitting ? 'Accepting…' : isPromoter ? 'Accept Invitation' : 'Sign up first to accept'}
            </button>
        </>
    )
}
