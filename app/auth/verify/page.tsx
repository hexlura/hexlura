'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resendVerificationEmail } from '../actions'
import { trackMetaEvent } from '@/components/analytics/MetaPixelEvents'

function VerifyContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const next = searchParams.get('next') || ''

    const [cooldown, setCooldown] = useState(0)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    // Fire once per signup (not on every refresh of this page)
    useEffect(() => {
        try {
            const key = `hexlura_meta_reg_${email}`
            if (sessionStorage.getItem(key)) return
            sessionStorage.setItem(key, '1')
        } catch { /* storage blocked — still fire once per mount */ }
        trackMetaEvent('CompleteRegistration', { status: true })
    }, [email])

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    async function handleResend() {
        if (!email) {
            setError('No email address found. Please register again.')
            return
        }

        setError('')
        setMessage('')
        setCooldown(60)

        const result = await resendVerificationEmail(email, next)
        if (result?.error) {
            setError(result.error)
        } else if (result?.success) {
            setMessage(result.success)
        }
    }

    return (
        <section className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-warm-red/10 flex items-center justify-center mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
            </div>

            <div className="mb-6">
                <h1 className="font-heading text-3xl tracking-wide mb-2">CHECK YOUR EMAIL</h1>
                <p className="text-sm text-muted">
                    We&apos;ve sent a verification link to{' '}
                    {email ? <span className="font-semibold text-text">{email}</span> : 'your email'}. Click the link to activate your account.
                </p>
            </div>

            {error && (
                <p className="text-sm text-accent bg-warm-red/10 rounded-lg px-3.5 py-2.5 mb-4">{error}</p>
            )}

            {message && (
                <p className="text-sm text-success bg-warm-green/10 rounded-lg px-3.5 py-2.5 mb-4">{message}</p>
            )}

            <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="w-full py-3 rounded-full border border-border bg-card text-sm font-semibold hover:bg-background transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Email'}
            </button>

            <p>
                <Link href={next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login'} className="text-sm text-accent font-semibold hover:underline">
                    ← Back to Log In
                </Link>
            </p>
        </section>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <section className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-warm-red/10 flex items-center justify-center mb-5">
                    <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
                <h1 className="font-heading text-3xl tracking-wide">CHECK YOUR EMAIL</h1>
            </section>
        }>
            <VerifyContent />
        </Suspense>
    )
}
