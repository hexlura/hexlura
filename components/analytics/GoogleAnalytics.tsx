'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
        dataLayer?: unknown[]
    }
}

export function GoogleAnalytics() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [consented, setConsented] = useState(false)

    // Read consent on mount + listen for the custom event the banner fires
    useEffect(() => {
        if (typeof window === 'undefined') return
        const stored = window.localStorage.getItem('hexlura_cookie_consent')
        if (stored === 'accepted') setConsented(true)

        const onConsent = () => setConsented(true)
        window.addEventListener('hexlura-consent-accepted', onConsent)
        return () => window.removeEventListener('hexlura-consent-accepted', onConsent)
    }, [])

    // Fire page_view on route change (App Router doesn't auto-fire)
    useEffect(() => {
        if (!consented || !MEASUREMENT_ID || !window.gtag) return
        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        window.gtag('event', 'page_view', {
            page_path: url,
            page_location: window.location.href,
            page_title: document.title,
        })
    }, [pathname, searchParams, consented])

    if (!MEASUREMENT_ID || !consented) return null

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${MEASUREMENT_ID}', { send_page_view: false });
                `}
            </Script>
        </>
    )
}
