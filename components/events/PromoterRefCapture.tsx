'use client'

import { useEffect } from 'react'

interface Props {
    eventId: string
}

const COOKIE_NAME = 'hex_ref'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * On mount: if `?ref=CODE` is present in the URL, set the `hex_ref` cookie
 * (last-touch wins) and POST to /api/promoter/track-click for server-side
 * recording. Bot UA filtering happens server-side.
 *
 * Renders nothing.
 */
export default function PromoterRefCapture({ eventId }: Props) {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const ref = params.get('ref')
        if (!ref) return

        // Last-touch wins: always overwrite the cookie when ?ref= is present
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`

        // Fire-and-forget click tracking
        void fetch('/api/promoter/track-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ref,
                event_id: eventId,
                referrer: document.referrer || undefined,
            }),
            keepalive: true,
        }).catch(() => { /* swallow — tracking is best-effort */ })
    }, [eventId])

    return null
}
