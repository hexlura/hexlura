import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border">
                <a href="/" className="font-heading text-2xl text-accent tracking-widest">HEXLURA</a>
                <a href="/account" className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back to Dashboard
                </a>
            </header>

            <div className="flex items-center justify-center p-6 py-12">
                <div className="max-w-md w-full text-center">
                    <div className="bg-card border border-border rounded-none p-10">
                        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <h1 className="font-heading text-3xl text-text tracking-wide mb-4">APPLICATION UNDER REVIEW</h1>
                        <p className="text-muted text-sm leading-relaxed mb-2">
                            Your organiser account is currently being reviewed by our team.
                        </p>
                        <p className="text-gold text-xs mb-6">Usually within 24 hours</p>
                        <p className="text-muted text-sm leading-relaxed mb-6">
                            We&apos;ll send you an email to <strong className="text-text">{user.email}</strong> once approved.
                        </p>

                        <div className="bg-surface border border-border rounded-none p-4 mb-8 text-left">
                            <p className="text-xs text-muted mb-1">Need help?</p>
                            <a href="mailto:support@hexlura.com" className="text-accent text-sm hover:underline font-medium">
                                support@hexlura.com
                            </a>
                        </div>

                        <form action={async () => {
                            'use server'
                            const { createClient } = await import('@/lib/supabase/server')
                            const { redirect } = await import('next/navigation')
                            const supabase = createClient()
                            await supabase.auth.signOut()
                            redirect('/')
                        }}>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-surface border border-border rounded-sm text-sm text-muted hover:text-text transition-colors"
                            >
                                Sign Out
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
