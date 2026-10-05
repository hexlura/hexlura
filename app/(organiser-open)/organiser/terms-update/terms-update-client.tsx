'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FocusShell } from '@/components/layout/FocusShell'

interface Props {
    orgName: string
    contentHtml: string
    version: string
}

// Blocks organiser dashboard access until they re-accept an updated Terms
// version. Team members are never routed here (see the (organiser) layout —
// the gate only fires for the organiser account owner), and the account
// owner can sign out instead of accepting, but cannot reach the dashboard
// without ticking the box.
export function TermsUpdateClient({ orgName, contentHtml, version }: Props) {
    const router = useRouter()
    const [agreed, setAgreed] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    async function handleAccept() {
        if (!agreed || submitting) return
        setSubmitting(true)
        setError('')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }

        // Allowed by the existing "Organisers can update own profile" RLS
        // policy (USING user_id = auth.uid()) — no service route needed.
        const { error: updateError } = await supabase
            .from('organiser_profiles')
            .update({ terms_version: version, terms_accepted_at: new Date().toISOString() })
            .eq('user_id', user.id)

        if (updateError) {
            setError('Could not record your acceptance — please try again.')
            setSubmitting(false)
            return
        }
        router.push('/organiser')
        router.refresh()
    }

    async function handleSignOut() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    return (
        <FocusShell
            align="top"
            right={<button onClick={handleSignOut} className="text-sm font-semibold text-muted hover:text-text transition">Sign out</button>}
        >
            <div className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-card p-8 md:p-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 13h6M9 17h6" /></svg>
                    </div>
                    <p className="text-xs font-bold tracking-widest text-accent">ACTION NEEDED</p>
                </div>
                <h1 className="font-heading text-4xl tracking-wide mb-2">TERMS &amp; CONDITIONS UPDATED</h1>
                <p className="text-sm text-muted leading-relaxed mb-6">
                    Hi {orgName || 'there'} — our Organiser Terms have been updated to <span className="font-mono text-text font-semibold">version {version}</span>.
                    Please read them below and accept to continue to your dashboard.
                </p>

                <div
                    className="max-h-80 overflow-y-auto rounded-2xl border border-border bg-background p-5 mb-6 text-sm leading-relaxed text-text [&_h2]:font-heading [&_h2]:text-xl [&_h2]:tracking-wide [&_h2]:text-accent [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                <label className="flex items-start gap-3 cursor-pointer mb-6">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 accent-[#E63950]" />
                    <span className="text-sm">
                        I have read and agree to the updated Terms &amp; Conditions (version {version}).
                    </span>
                </label>

                {error && <p className="text-xs font-semibold text-accent mb-4">{error}</p>}

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleAccept}
                        disabled={!agreed || submitting}
                        className="px-8 py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Saving…' : 'Accept & Continue'}
                    </button>
                    <button onClick={handleSignOut} className="text-sm font-semibold text-muted hover:text-text transition">
                        Sign out instead
                    </button>
                </div>
            </div>
        </FocusShell>
    )
}
