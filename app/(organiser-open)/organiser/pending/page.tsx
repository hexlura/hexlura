import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FocusShell } from '@/components/layout/FocusShell'

export default async function OrganiserPendingPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // If already approved, redirect to portal
    const { data: organiser } = await supabase
        .from('organiser_profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single()

    if (organiser?.is_approved) redirect('/organiser')

    async function signOutAction() {
        'use server'
        const { createClient: createServerClient } = await import('@/lib/supabase/server')
        const { redirect: redirectTo } = await import('next/navigation')
        const supabaseClient = createServerClient()
        await supabaseClient.auth.signOut()
        redirectTo('/')
    }

    return (
        <FocusShell
            right={
                <form action={signOutAction}>
                    <button type="submit" className="text-sm font-semibold text-muted hover:text-text transition">Sign out</button>
                </form>
            }
        >
            <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-card p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-warm-amber/15 flex items-center justify-center mx-auto mb-6">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#9C6900" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <h1 className="font-heading text-4xl tracking-wide mb-3">APPLICATION UNDER REVIEW</h1>
                <p className="text-sm text-muted leading-relaxed mb-3">Your organiser account is being reviewed by our team.</p>
                <span className="inline-block text-xs font-bold text-warm-amberText bg-warm-amber/15 rounded-full px-3 py-1 mb-5">Usually within 24 hours</span>
                <p className="text-sm text-muted leading-relaxed mb-7">
                    We&apos;ll email <strong className="text-text">{user.email}</strong> as soon as you&apos;re approved.
                </p>

                <div className="rounded-2xl border border-border bg-background p-4 text-left mb-7">
                    <p className="text-xs text-muted mb-0.5">Need help?</p>
                    <a href="mailto:support@hexlura.com" className="text-sm font-semibold text-accent hover:underline">
                        support@hexlura.com
                    </a>
                </div>

                <form action={signOutAction}>
                    <button
                        type="submit"
                        className="px-7 py-2.5 rounded-full border border-border bg-card text-sm font-semibold text-muted hover:text-text transition"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </FocusShell>
    )
}
