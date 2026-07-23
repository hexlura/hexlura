'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OrganiserSummary {
    organiser_id: string
    org_name: string
    slug: string
    logo_url: string | null
    following: boolean
}

// Passive confirmation shown on the booking confirmation page after the
// buyer has been silently followed to the organiser (see lib/auto-follow.ts,
// called from the checkout webhook and the free-booking path). There is no
// "Follow" button here — the follow has already happened server-side by the
// time this component loads; this only surfaces it and offers an immediate
// one-tap Unfollow, so the auto-follow is never entirely invisible to the buyer.
// Renders nothing while loading, on any error, or if the buyer isn't
// following (e.g. the webhook hasn't landed yet) — this must never be a
// load-bearing part of the confirmation page.
export default function FollowOrganiserPrompt({ bookingRef }: { bookingRef: string }) {
    const [organiser, setOrganiser] = useState<OrganiserSummary | null>(null)
    const [unfollowed, setUnfollowed] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/bookings/${encodeURIComponent(bookingRef)}/organiser`)
            .then(res => (res.ok ? res.json() : null))
            .then((data: OrganiserSummary | null) => {
                if (!cancelled && data && data.following) setOrganiser(data)
            })
            .catch(() => { /* prompt is optional — never surface errors here */ })
        return () => { cancelled = true }
    }, [bookingRef])

    if (!organiser || unfollowed) return null

    async function handleUnfollow() {
        if (!organiser || loading) return
        setLoading(true)
        try {
            const res = await fetch('/api/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organiser_id: organiser.organiser_id }),
            })
            const data = await res.json()
            if (res.ok && !data.following) setUnfollowed(true)
        } catch { /* leave as-is; user can retry */ }
        setLoading(false)
    }

    return (
        <div className="bg-success/10 border border-success/20 rounded-none p-6 space-y-2 text-center">
            <p className="text-success font-semibold text-sm">✓ You&apos;re now following {organiser.org_name}</p>
            <p className="text-muted text-xs">
                We&apos;ll let you know about their future events. Find them any time in your{' '}
                <Link href="/favourites" className="underline hover:text-text">favourites</Link>.
            </p>
            <button
                onClick={handleUnfollow}
                disabled={loading}
                className="text-xs text-muted hover:text-text underline disabled:opacity-60"
            >
                {loading ? 'Unfollowing…' : 'Not interested — unfollow'}
            </button>
        </div>
    )
}
