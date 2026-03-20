'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'

export default function RegisterPage() {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError('')
        setLoading(true)

        const result = await signUp(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <section className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="font-heading text-4xl text-text">CREATE ACCOUNT</h1>
                <p className="text-muted text-sm">Join Hexlura and discover amazing events.</p>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="full_name" className="text-sm font-medium text-text">Full Name</label>
                    <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

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

                <div className="flex flex-col gap-1">
                    <label htmlFor="password" className="text-sm font-medium text-text">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Min 8 characters"
                        className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {error && (
                    <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 hover:-translate-y-px active:translate-y-0 active:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
                >
                    {loading && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            <p className="text-center text-sm text-muted">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-accent hover:underline font-medium">
                    Sign in
                </Link>
            </p>
        </section>
    )
}
