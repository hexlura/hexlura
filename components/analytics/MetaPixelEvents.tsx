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
}: {
    valuePence: number
    numItems: number
}) {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.fbq) return
        window.fbq('track', 'InitiateCheckout', {
            value: valuePence / 100,
            currency: 'GBP',
            num_items: numItems,
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

export function MetaPixelPurchase({
    valuePence,
    bookingRef,
}: {
    valuePence: number
    bookingRef: string
}) {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.fbq) return
        window.fbq('track', 'Purchase', {
            value: valuePence / 100,
            currency: 'GBP',
            content_ids: [bookingRef],
            content_type: 'product',
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}
