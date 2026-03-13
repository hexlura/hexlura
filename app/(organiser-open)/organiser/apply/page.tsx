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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="max-w-xl w-full">
                <div className="font-heading text-3xl text-accent tracking-widest text-center mb-8">HEXLURA</div>
                <div className="bg-card border border-border rounded-2xl p-8">
                    <h1 className="font-heading text-3xl text-text tracking-wide mb-2">BECOME AN ORGANISER</h1>
                    <p className="text-muted text-sm mb-8">Tell us about your events and we&apos;ll get you set up.</p>
                    <ApplyForm userId={user.id} userEmail={user.email || ''} />
                </div>
            </div>
        </div>
    )
}
