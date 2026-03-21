'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, signInWithGoogle } from '../actions'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const next = searchParams.get('next') || ''

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError('')
        setLoading(true)

        const result = await signIn(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else if (result?.redirectTo) {
            router.push(result.redirectTo)
        }
    }

    async function handleGoogleSignIn() {
        setError('')
        const result = await signInWithGoogle()
        if (result?.error) {
            setError(result.error)
        }
    }

    return (
        <section className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="font-heading text-4xl text-text">SIGN IN</h1>
                <p className="text-muted text-sm">Welcome back to Hexlura.</p>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
                <input type="hidden" name="next" value={next} />

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
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-text">Password</label>
                        <Link href="/auth/reset-password" className="text-xs text-accent hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Your password"
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
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface px-2 text-muted">or</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-11 rounded-lg border border-border bg-card text-text font-medium text-sm hover:bg-card/80 transition flex items-center justify-center gap-3"
            >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </button>

            <p className="text-center text-sm text-muted">
                Don&apos;t have an account?{' '}
                <Link
                    href={next ? `/auth/register?next=${encodeURIComponent(next)}` : '/auth/register'}
                    className="text-accent hover:underline font-medium"
                >
                    Create one
                </Link>
            </p>
        </section>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <section className="space-y-6 text-center">
                <h1 className="font-heading text-4xl text-text">SIGN IN</h1>
            </section>
        }>
            <LoginContent />
        </Suspense>
    )
}
