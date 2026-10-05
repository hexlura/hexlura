'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '../actions'

export default function ResetPasswordPage() {
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError('')
        setSuccess('')
        setLoading(true)

        const result = await resetPassword(formData)
        if (result?.error) {
            setError(result.error)
        } else if (result?.success) {
            setSuccess(result.success)
        }
        setLoading(false)
    }

    return (
        <section>
            <div>
                <h1 className="font-heading text-3xl tracking-wide mb-1">RESET PASSWORD</h1>
                <p className="text-muted text-sm mb-6">Enter your email and we&apos;ll send you a link to reset your password.</p>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
                <div className="flex flex-col">
                    <label htmlFor="email" className="text-xs font-semibold text-muted mb-1.5 block">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                    />
                </div>

                {error && (
                    <p className="text-sm text-accent bg-warm-red/10 rounded-lg px-3.5 py-2.5">{error}</p>
                )}

                {success && (
                    <p className="text-sm text-success bg-warm-green/10 rounded-lg px-3.5 py-2.5">{success}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2"
                >
                    {loading && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>

            <p className="text-center text-sm text-muted mt-6">
                <Link href="/auth/login" className="text-accent font-semibold hover:underline">
                    ← Back to Log In
                </Link>
            </p>
        </section>
    )
}
