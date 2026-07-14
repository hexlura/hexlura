'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
        <div className="min-h-screen bg-background">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border">
                <span className="font-heading text-2xl text-accent tracking-widest">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></span>
                <button onClick={handleSignOut} className="text-sm text-muted hover:text-text transition-colors">Sign out</button>
            </header>

            <div className="max-w-2xl mx-auto p-6 py-12">
                <div className="bg-card border border-border rounded-none p-8">
                    <h1 className="font-heading text-3xl text-text tracking-wide mb-2">TERMS &amp; CONDITIONS UPDATED</h1>
                    <p className="text-muted text-sm mb-6">
                        Hi {orgName || 'there'} — our Organiser Terms have been updated to version {version}.
                        Please review the current terms below and accept to continue to your dashboard.
                    </p>

                    <div
                        className="max-h-96 overflow-y-auto border border-border bg-surface p-4 mb-6 text-sm text-text [&_h2]:font-heading [&_h2]:text-lg [&_h2]:text-accent [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />

                    <label className="flex items-start gap-2 mb-6 cursor-pointer">
                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-accent" />
                        <span className="text-sm text-text">
                            I have read and agree to the updated Terms &amp; Conditions (version {version}).
                        </span>
                    </label>

                    {error && <p className="text-accent text-xs mb-4">{error}</p>}

                    <button
                        onClick={handleAccept}
                        disabled={!agreed || submitting}
                        className="h-11 px-8 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Saving…' : 'Accept & Continue'}
                    </button>
                </div>
            </div>
        </div>
    )
}
