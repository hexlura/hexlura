'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'hexlura_cookie_consent'

export function CookieConsent() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (!stored) setVisible(true)
    }, [])

    function accept() {
        window.localStorage.setItem(STORAGE_KEY, 'accepted')
        window.dispatchEvent(new Event('hexlura-consent-accepted'))
        setVisible(false)
    }

    function decline() {
        window.localStorage.setItem(STORAGE_KEY, 'declined')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:pb-6 pointer-events-none"
        >
            <div className="mx-auto max-w-3xl bg-white border border-[#C0C0C8] shadow-lg pointer-events-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-[#0A0A0F] flex-1 leading-relaxed">
                    We use a small number of cookies to keep you signed in and to understand how the site is used. You can accept analytics or decline — essential cookies are always on.{' '}
                    <Link href="/cookies" className="text-accent underline hover:no-underline">Read more</Link>.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={decline}
                        className="text-sm px-4 py-2 border border-[#C0C0C8] text-[#666677] hover:text-[#0A0A0F] hover:border-[#0A0A0F] transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        className="text-sm px-4 py-2 bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        Accept all
                    </button>
                </div>
            </div>
        </div>
    )
}
