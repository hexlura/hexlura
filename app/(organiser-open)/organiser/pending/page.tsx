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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="font-heading text-3xl text-accent tracking-widest mb-8">HEXLURA</div>

                <div className="bg-card border border-border rounded-2xl p-10">
                    <div className="text-5xl mb-6">🕐</div>
                    <h1 className="font-heading text-3xl text-text tracking-wide mb-4">APPLICATION UNDER REVIEW</h1>
                    <p className="text-muted text-sm leading-relaxed mb-6">
                        Your organiser account is currently being reviewed by our team.
                        We&apos;ll send you an email within 24 hours once approved.
                    </p>
                    <p className="text-sm text-muted mb-8">
                        Questions?{' '}
                        <a href="mailto:support@hexlura.com" className="text-accent hover:underline">
                            support@hexlura.com
                        </a>
                    </p>

                    <form action="/auth/signout" method="post">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-surface border border-border rounded-lg text-sm text-muted hover:text-text transition-colors"
                        >
                            Sign Out
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
