import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ApplyForm } from './apply-form'
import { FocusShell, focusLinkClass } from '@/components/layout/FocusShell'

export default async function PromoterApplyPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter/apply')

    // Already a promoter? Send them straight to the dashboard.
    const serviceClient = createServiceClient()
    const { data: existing } = await serviceClient
        .from('promoter_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    if (existing) redirect('/promoter')

    const defaultName = (user.user_metadata?.full_name as string | undefined) || ''

    return (
        <FocusShell
            right={
                <Link href="/account" className={focusLinkClass}>
                    My account
                </Link>
            }
        >
            <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-card p-8 md:p-10">
                <p className="text-xs font-bold tracking-widest text-accent mb-2">PROMOTER ACCOUNT</p>
                <h1 className="font-heading text-4xl tracking-wide mb-1">BECOME A PROMOTER</h1>
                <p className="text-sm text-muted mb-7">Share event links, earn commission on every ticket you sell. Free to join — no application, instant access.</p>
                <ApplyForm defaultName={defaultName} />
            </div>
        </FocusShell>
    )
}
