'use client'

import { useEffect } from 'react'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90 // Meta's 90-day attribution window

/**
 * Persists Meta's click ID. When a visitor lands from a Meta ad the URL carries `?fbclid=…`;
 * Meta expects it stored as the `_fbc` cookie (`fb.1.<timestamp ms>.<fbclid>`) and sent back
 * with server-side events. The Pixel normally writes this itself, but only if it loaded — this
 * keeps the click ID when the Pixel is blocked or slow, so the checkout API can still pass it
 * to the Conversions API and tie the sale back to the ad click.
 *
 * Renders nothing.
 */
export function MetaClickId() {
    useEffect(() => {
        try {
            const fbclid = new URLSearchParams(window.location.search).get('fbclid')
            if (!fbclid) return
            const existing = document.cookie.split('; ').find(c => c.startsWith('_fbc='))
            // Same click already stored — keep its original timestamp
            if (existing && existing.endsWith(`.${fbclid}`)) return
            document.cookie = `_fbc=fb.1.${Date.now()}.${encodeURIComponent(fbclid)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`
        } catch { /* cookies blocked — attribution is best-effort */ }
    }, [])

    return null
}
