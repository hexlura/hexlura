'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { updatePassword } from '../actions'

function UpdatePasswordForm() {
    const searchParams = useSearchParams()
    const urlError = searchParams.get('error_description') || searchParams.get('error')
    const isExpired = searchParams.get('error_code') === 'otp_expired'

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError('')
        setLoading(true)

        const result = await updatePassword(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setLoading(false)
            setSuccess(true)
        }
    }

    if (urlError) {
        return (
            <section className="text-center">
                <div className="w-16 h-16 rounded-full bg-warm-red/10 flex items-center justify-center mx-auto mb-5">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                </div>
                <h1 className="font-heading text-3xl tracking-wide mb-2">LINK EXPIRED</h1>
                <p className="text-sm text-muted mb-6">
                    {isExpired
                        ? 'This password reset link is invalid or has expired. Please request a new one.'
                        : `${urlError.replace(/\+/g, ' ')} Please request a new one.`}
                </p>
                <a href="/auth/reset-password" className="block w-full py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition text-center">
                    Request New Link
                </a>
            </section>
        )
    }

    if (success) {
        return (
            <section className="text-center">
                <div className="w-16 h-16 rounded-full bg-warm-green/10 flex items-center justify-center mx-auto mb-5">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="3"><path d="m5 13 4 4L19 7" /></svg>
                </div>
                <h1 className="font-heading text-3xl tracking-wide mb-2">PASSWORD UPDATED</h1>
                <p className="text-sm text-muted mb-6">Your password has been changed successfully.</p>
                <a href="/auth/login" className="block w-full py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition text-center">
                    Go to Login
                </a>
            </section>
        )
    }

    return (
        <section>
            <div>
                <h1 className="font-heading text-3xl tracking-wide mb-1">SET NEW PASSWORD</h1>
                <p className="text-muted text-sm mb-6">Choose a new password for your account.</p>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
                <div className="flex flex-col">
                    <label htmlFor="password" className="text-xs font-semibold text-muted mb-1.5 block">New Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Min 8 characters"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="confirm_password" className="text-xs font-semibold text-muted mb-1.5 block">Confirm New Password</label>
                    <input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Repeat your password"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                    />
                </div>

                {error && (
                    <p className="text-sm text-accent bg-warm-red/10 rounded-lg px-3.5 py-2.5">{error}</p>
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
                    {loading ? 'Updating Password...' : 'Update Password'}
                </button>
            </form>
        </section>
    )
}

export default function UpdatePasswordPage() {
    return (
        <Suspense>
            <UpdatePasswordForm />
        </Suspense>
    )
}
