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

    // Start bar on anchor clicks (before navigation completes)
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = (e.target as HTMLElement).closest('a')
            if (!target) return
            const href = target.getAttribute('href')
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
            if (target.target === '_blank') return
            try {
                const url = new URL(href, window.location.href)
                if (url.origin !== window.location.origin) return
                if (url.pathname === window.location.pathname && url.search === window.location.search) return
            } catch {
                return
            }
            NProgress.start()
            started.current = true
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
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
