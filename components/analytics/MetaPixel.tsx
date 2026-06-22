'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void
        _fbq?: unknown
    }
}

export function MetaPixelInit({ pixelId }: { pixelId: string }) {
    const [consented, setConsented] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.localStorage.getItem('hexlura_cookie_consent') === 'accepted') setConsented(true)
        const onConsent = () => setConsented(true)
        window.addEventListener('hexlura-consent-accepted', onConsent)
        return () => window.removeEventListener('hexlura-consent-accepted', onConsent)
    }, [])

    if (!pixelId || !consented) return null

    return (
        <Script id="meta-pixel-init" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');
            fbq('track','PageView');
        `}</Script>
    )
}
