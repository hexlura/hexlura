'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { updatePassword } from '../actions'

export default function UpdatePasswordPage() {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [ready, setReady] = useState(false)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        // Sign out any existing session first so the recovery token
        // establishes a clean session for the correct account
        supabase.auth.signOut().then(() => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (event) => {
                    if (event === 'PASSWORD_RECOVERY') {
                        setReady(true)
                    }
                }
            )
            return () => subscription.unsubscribe()
        })
    }, [])

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

    if (!ready) {
        return (
            <section className="space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="font-heading text-4xl text-text">NEW PASSWORD</h1>
                    <p className="text-muted text-sm">Verifying your reset link...</p>
                </div>
                <div className="flex justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            </section>
        )
    }

    if (success) {
        return (
            <section className="space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="font-heading text-4xl text-text">PASSWORD UPDATED</h1>
                    <p className="text-muted text-sm">Your password has been changed successfully.</p>
                </div>
                <div className="bg-success/10 border border-success/20 rounded-none px-4 py-3 text-center">
                    <p className="text-sm text-success">You can now sign in with your new password.</p>
                </div>
                <a
                    href="/auth/login"
                    className="block w-full h-11 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition text-center leading-[2.75rem]"
                >
                    Go to Login
                </a>
            </section>
        )
    }

    return (
        <section className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="font-heading text-4xl text-text">NEW PASSWORD</h1>
                <p className="text-muted text-sm">Choose a new password for your account.</p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="password" className="text-sm font-medium text-text">New Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Min 8 characters"
                        className="h-11 w-full rounded-sm border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="confirm_password" className="text-sm font-medium text-text">Confirm Password</label>
                    <input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Repeat your password"
                        className="h-11 w-full rounded-sm border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {error && (
                    <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-none px-4 py-2">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </section>
    )
}
