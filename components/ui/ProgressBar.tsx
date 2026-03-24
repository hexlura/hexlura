'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import { Suspense } from 'react'

NProgress.configure({ showSpinner: false, trickleSpeed: 200 })

function ProgressBarInner() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const started = useRef(false)

    // Patch history.pushState and replaceState to catch ALL navigation (links + router.push)
    useEffect(() => {
        const originalPush = history.pushState.bind(history)
        const originalReplace = history.replaceState.bind(history)

        function interceptPush(data: unknown, unused: string, url?: string | URL | null) {
            if (url) {
                try {
                    const next = new URL(String(url), window.location.href)
                    const same = next.pathname === window.location.pathname && next.search === window.location.search
                    if (!same) { NProgress.start(); started.current = true }
                } catch { /* ignore */ }
            }
            return originalPush(data, unused, url)
        }

        history.pushState = interceptPush as typeof history.pushState
        history.replaceState = originalReplace

        return () => {
            history.pushState = originalPush
            history.replaceState = originalReplace
        }
    }, [])

    // Stop bar when route finishes
    useEffect(() => {
        NProgress.done()
        started.current = false
    }, [pathname, searchParams])

    return (
        <style>{`
            #nprogress { pointer-events: none; }
            #nprogress .bar {
                background: #E63950;
                position: fixed;
                z-index: 9999;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
            }
            #nprogress .peg {
                display: block;
                position: absolute;
                right: 0px;
                width: 100px;
                height: 100%;
                box-shadow: 0 0 10px #E63950, 0 0 5px #E63950;
                opacity: 1;
                transform: rotate(3deg) translate(0px, -4px);
            }
        `}</style>
    )
}

export default function NavigationProgress() {
    return (
        <Suspense fallback={null}>
            <ProgressBarInner />
        </Suspense>
    )
}
