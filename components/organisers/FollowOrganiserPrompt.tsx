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

// One-tap follow prompt shown on the booking confirmation page.
// Renders nothing while loading, on any error, or if the buyer already
// follows the organiser — the confirmation page must never depend on it.
export default function FollowOrganiserPrompt({ bookingRef }: { bookingRef: string }) {
    const [organiser, setOrganiser] = useState<OrganiserSummary | null>(null)
    const [followed, setFollowed] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/bookings/${encodeURIComponent(bookingRef)}/organiser`)
            .then(res => (res.ok ? res.json() : null))
            .then((data: OrganiserSummary | null) => {
                if (!cancelled && data && !data.following) setOrganiser(data)
            })
            .catch(() => { /* prompt is optional — never surface errors here */ })
        return () => { cancelled = true }
    }, [bookingRef])

    if (!organiser) return null

    async function handleFollow() {
        if (!organiser || loading) return
        setLoading(true)
        try {
            const res = await fetch('/api/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organiser_id: organiser.organiser_id }),
            })
            const data = await res.json()
            if (res.ok && data.following) setFollowed(true)
        } catch { /* leave the button as-is; user can retry */ }
        setLoading(false)
    }

    if (followed) {
        return (
            <div className="bg-success/10 border border-success/20 rounded-none p-6 space-y-1 text-center">
                <p className="text-success font-semibold text-sm">✓ You&apos;re following {organiser.org_name}</p>
                <p className="text-muted text-xs">
                    Find them any time in your{' '}
                    <Link href="/favourites" className="underline hover:text-text">favourites</Link>.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-none p-6 space-y-3 text-center">
            <p className="text-text font-semibold">Enjoyed booking with {organiser.org_name}?</p>
            <p className="text-muted text-sm">Follow them and never miss their next event.</p>
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={handleFollow}
                    disabled={loading}
                    className="h-10 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-60"
                >
                    {loading ? 'Following…' : `+ Follow ${organiser.org_name}`}
                </button>
                <Link
                    href={`/organisers/${organiser.slug}`}
                    className="text-sm text-muted hover:text-text underline"
                >
                    View profile
                </Link>
            </div>
        </div>
    )
}
