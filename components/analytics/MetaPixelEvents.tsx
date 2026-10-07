'use client'

import { useEffect } from 'react'

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void
        _fbq?: unknown
    }
}

export function MetaPixelViewContent({
    organiserPixelId,
    eventId,
    eventName,
    valuePence,
}: {
    organiserPixelId?: string | null
    eventId: string
    eventName: string
    valuePence: number
}) {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.fbq) return
        if (organiserPixelId) window.fbq('init', organiserPixelId)
        window.fbq('track', 'ViewContent', {
            content_ids: [eventId],
            content_name: eventName,
            content_type: 'product',
            value: valuePence / 100,
            currency: 'GBP',
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

export function MetaPixelInitiateCheckout({
    valuePence,
    numItems,
    eventId,
}: {
    valuePence: number
    numItems: number
    eventId?: string
}) {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.fbq) return
        window.fbq('track', 'InitiateCheckout', {
            value: valuePence / 100,
            currency: 'GBP',
            num_items: numItems,
            ...(eventId ? { content_ids: [eventId], content_type: 'product' } : {}),
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

export function MetaPixelPurchase({
    valuePence,
    bookingRef,
    eventId,
}: {
    valuePence: number
    bookingRef: string
    eventId: string
}) {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.fbq) return
        // £0 bookings are not purchases — a zero-value Purchase skews ad optimisation
        if (valuePence <= 0) return
        // eventID = booking ref, identical to the server-side CAPI event_id, so Meta
        // collapses the browser + server pair into one Purchase.
        window.fbq('track', 'Purchase', {
            value: valuePence / 100,
            currency: 'GBP',
            content_ids: [eventId],
            content_type: 'product',
            order_id: bookingRef,
        }, { eventID: bookingRef })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

export function trackMetaEvent(
    name: 'AddToCart' | 'Lead' | 'CompleteRegistration',
    params: Record<string, unknown> = {}
) {
    if (typeof window === 'undefined' || !window.fbq) return
    window.fbq('track', name, params)
}
