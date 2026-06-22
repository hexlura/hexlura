import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApplyForm } from './apply-form'

export default async function OrganiserApplyPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/organiser/apply')

    // Already an organiser?
    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role === 'organiser') redirect('/organiser')
    if (profile?.role === 'admin') redirect('/admin')

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
                <div className="max-w-xl w-full">
                    <div className="bg-card border border-border rounded-none p-8">
                        <h1 className="font-heading text-3xl text-text tracking-wide mb-2">BECOME AN ORGANISER</h1>
                        <p className="text-muted text-sm mb-8">Tell us about your events and we&apos;ll get you set up.</p>
                        <ApplyForm userId={user.id} userEmail={user.email || ''} />
                    </div>
                </div>
            </div>
        </div>
    )
}
