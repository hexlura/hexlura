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
        <section className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="font-heading text-4xl text-text">RESET PASSWORD</h1>
                <p className="text-muted text-sm">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="email" className="text-sm font-medium text-text">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {error && (
                    <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{error}</p>
                )}

                {success && (
                    <p className="text-sm text-success bg-success/10 border border-success/20 rounded-lg px-4 py-2">{success}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            <p className="text-center text-sm text-muted">
                <Link href="/auth/login" className="text-accent hover:underline font-medium">
                    Back to sign in
                </Link>
            </p>
        </section>
    )
}
