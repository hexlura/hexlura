'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="warm-theme min-h-screen flex flex-col">
            <header className="px-6 py-5">
                <Link href="/" className="font-heading text-3xl text-accent tracking-wider">
                    HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup>
                </Link>
            </header>
            <main className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-warm-amber/15 flex items-center justify-center mb-6">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9C6900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
                    </div>
                    <h1 className="font-heading text-5xl tracking-wide mb-3">SOMETHING WENT WRONG</h1>
                    <p className="text-muted mb-8">
                        We hit an unexpected problem. It&apos;s not you — please try again. If it keeps happening, our team can help.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition"
                        >
                            Try again
                        </button>
                        <Link href="/" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-card border border-border text-sm font-semibold hover:border-text/30 transition">
                            Back to home
                        </Link>
                    </div>
                    <p className="text-xs text-muted mt-8">
                        Need help?{' '}
                        <a href="mailto:support@hexlura.com" className="text-accent font-semibold hover:underline">support@hexlura.com</a>
                    </p>
                    {error.digest && (
                        <p className="text-[11px] text-muted/70 font-mono mt-3">Reference: {error.digest}</p>
                    )}
                </div>
            </main>
        </div>
    )
}
