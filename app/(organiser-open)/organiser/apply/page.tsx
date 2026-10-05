import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ApplyForm } from './apply-form'
import { getLatestLegalDocument } from '@/lib/legal'
import { TERMS_VERSION } from '@/lib/terms'
import { FocusShell, focusLinkClass } from '@/components/layout/FocusShell'

export default async function OrganiserApplyPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/organiser/apply')

    // Already an organiser?
    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role === 'organiser') redirect('/organiser')
    if (profile?.role === 'admin') redirect('/admin')

    // Acceptance is stamped with the currently-published terms version
    // (falls back to the code constant until the first admin publish)
    const publishedTerms = await getLatestLegalDocument('terms')
    const termsVersion = publishedTerms?.version ?? TERMS_VERSION

    return (
        <FocusShell
            align="top"
            right={
                <Link href="/account" className={focusLinkClass}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to account
                </Link>
            }
        >
            <div className="w-full max-w-2xl">
                <div className="bg-card rounded-3xl border border-border shadow-card p-8 md:p-10">
                    <p className="text-xs font-bold tracking-widest text-accent mb-2">ORGANISER ACCOUNT</p>
                    <h1 className="font-heading text-4xl tracking-wide mb-1">BECOME AN ORGANISER</h1>
                    <p className="text-sm text-muted mb-8">Tell us about your events and we&apos;ll get you set up. It only takes a minute.</p>
                    <ApplyForm userId={user.id} userEmail={user.email || ''} termsVersion={termsVersion} />
                </div>
                <p className="text-xs text-muted text-center mt-6">
                    Need a hand?{' '}
                    <a href="mailto:support@hexlura.com" className="text-accent font-semibold hover:underline">support@hexlura.com</a>
                </p>
            </div>
        </FocusShell>
    )
}
