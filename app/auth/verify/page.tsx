'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resendVerificationEmail } from '../actions'

function VerifyContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''

    const [cooldown, setCooldown] = useState(0)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

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

        const result = await resendVerificationEmail(email)
        if (result?.error) {
            setError(result.error)
        } else if (result?.success) {
            setMessage(result.success)
        }
    }

    return (
        <section className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-none bg-accent/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
            </div>

            <div className="space-y-2">
                <h1 className="font-heading text-4xl text-text">VERIFY EMAIL</h1>
                <p className="text-muted text-sm">
                    We&apos;ve sent a verification link to{' '}
                    {email ? <span className="text-text font-medium">{email}</span> : 'your email'}.
                </p>
                <p className="text-muted text-sm">
                    Click the link in the email to activate your account.
                </p>
            </div>

            {error && (
                <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-none px-4 py-2">{error}</p>
            )}

            {message && (
                <p className="text-sm text-success bg-success/10 border border-success/20 rounded-none px-4 py-2">{message}</p>
            )}

            <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="w-full h-11 rounded-sm border border-border bg-card text-text font-medium text-sm hover:bg-card/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
            </button>

            <p className="text-sm text-muted">
                <Link href="/auth/login" className="text-accent hover:underline font-medium">
                    Back to sign in
                </Link>
            </p>
        </section>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <section className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-none bg-accent/10 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
                <h1 className="font-heading text-4xl text-text">VERIFY EMAIL</h1>
            </section>
        }>
            <VerifyContent />
        </Suspense>
    )
}
