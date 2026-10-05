'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FocusShell } from '@/components/layout/FocusShell'

const PRIVILEGE_LABELS: Record<string, string> = {
    door_staff: 'Door Staff',
}

function AcceptContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    type State = 'loading' | 'invalid' | 'already_accepted' | 'wrong_account' | 'ready' | 'accepting' | 'success' | 'error'
    const [state, setState] = useState<State>('loading')
    const [orgName, setOrgName] = useState('')
    const [privilege, setPrivilege] = useState('')
    const [memberId, setMemberId] = useState('')
    const [invitedEmail, setInvitedEmail] = useState('')

    useEffect(() => {
        if (!token) { setState('invalid'); return }

        async function check() {
            // Use API route to check token — anon client can't read organiser_team due to RLS
            const res = await fetch(`/api/team/check?token=${encodeURIComponent(token!)}`)

            if (res.status === 409) { setState('already_accepted'); return }
            if (!res.ok) { setState('invalid'); return }

            const invite = await res.json()
            setOrgName(invite.org_name)
            setPrivilege(invite.privilege)
            setMemberId(invite.id)

            // Check auth — auto-redirect to login if not signed in
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace(`/auth/login?next=${encodeURIComponent(`/team/accept?token=${token}`)}`)
                return
            }

            setState('ready')
        }

        check()
    }, [token, router])

    async function handleAccept() {
        setState('accepting')
        const res = await fetch('/api/team/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId }),
        })
        if (res.status === 403) {
            const json = await res.json()
            setInvitedEmail(json.invited_email || '')
            setState('wrong_account')
            return
        }
        if (!res.ok) { setState('error'); return }
        setState('success')
    }

    const cardClass = 'w-full max-w-md bg-card rounded-3xl border border-border shadow-card p-8 text-center'
    const primaryClass = 'block w-full py-3.5 rounded-full bg-accent text-white font-semibold text-center shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none'
    const icon = (tint: string, path: React.ReactNode) => (
        <div className={`w-14 h-14 rounded-2xl ${tint} flex items-center justify-center mx-auto mb-4`}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
        </div>
    )
    const tick = <path d="m5 12 5 5L20 7" />
    const cross = <path d="M18 6 6 18M6 6l12 12" />
    const warn = <><path d="M12 8v5" /><path d="M12 17h.01" /></>
    const signInAgain = `/auth/login?next=${encodeURIComponent(`/team/accept?token=${token}`)}`

    if (state === 'loading') {
        return (
            <div className={cardClass}>
                <p className="text-muted text-sm">Verifying invitation...</p>
            </div>
        )
    }

    if (state === 'invalid') {
        return (
            <div className={cardClass}>
                {icon('bg-accent/10 text-accent', cross)}
                <h1 className="font-heading text-3xl tracking-wide mb-2">INVALID INVITATION</h1>
                <p className="text-sm text-muted mb-5">This invitation link is invalid or has expired.</p>
                <Link href="/" className="text-sm text-accent font-semibold hover:underline">Return to homepage</Link>
            </div>
        )
    }

    if (state === 'wrong_account') {
        return (
            <div className={cardClass}>
                {icon('bg-warm-amber/15 text-warm-amberText', warn)}
                <h1 className="font-heading text-3xl tracking-wide mb-2">WRONG ACCOUNT</h1>
                <p className="text-sm text-muted leading-relaxed mb-5">
                    This invitation was sent to <strong className="text-text">{invitedEmail}</strong>. Please sign in with that account to accept it.
                </p>
                <button onClick={() => router.replace(signInAgain)} className={primaryClass}>
                    Sign in with correct account
                </button>
            </div>
        )
    }

    if (state === 'already_accepted') {
        return (
            <div className={cardClass}>
                {icon('bg-warm-green/10 text-warm-green', tick)}
                <h1 className="font-heading text-3xl tracking-wide mb-2">ALREADY ACCEPTED</h1>
                <p className="text-sm text-muted mb-5">You have already accepted this invitation.</p>
                <Link href="/checkin" className={primaryClass}>Go to check-in scanner</Link>
            </div>
        )
    }

    if (state === 'success') {
        return (
            <div className={cardClass}>
                {icon('bg-warm-green/10 text-warm-green', tick)}
                <h1 className="font-heading text-3xl tracking-wide mb-2">WELCOME TO THE TEAM!</h1>
                <p className="text-sm text-muted leading-relaxed mb-5">
                    You have joined <strong className="text-text">{orgName}</strong> as <strong className="text-text">Door Staff</strong>.
                </p>
                <Link href="/checkin" className={primaryClass}>Go to check-in scanner</Link>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className={cardClass}>
                {icon('bg-accent/10 text-accent', cross)}
                <h1 className="font-heading text-3xl tracking-wide mb-2">SOMETHING WENT WRONG</h1>
                <p className="text-sm text-muted mb-5">Failed to accept the invitation. Please try again.</p>
                <button onClick={() => setState('ready')} className={primaryClass}>Try again</button>
            </div>
        )
    }

    // ready or accepting
    return (
        <div className={cardClass}>
            {icon('bg-accent/10 text-accent', <><circle cx="12" cy="8" r="3.5" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>)}
            <h1 className="font-heading text-3xl tracking-wide mb-2">TEAM INVITATION</h1>
            <p className="text-sm text-muted leading-relaxed mb-5">
                You&apos;ve been invited to join <strong className="text-text">{orgName}</strong> as <strong className="text-text">{PRIVILEGE_LABELS[privilege] || privilege}</strong>.
                You will have access to the ticket scanner for check-in.
            </p>
            <button onClick={handleAccept} disabled={state === 'accepting'} className={primaryClass}>
                {state === 'accepting' ? 'Accepting...' : 'Accept invitation'}
            </button>
        </div>
    )
}

export default function TeamAcceptPage() {
    return (
        <FocusShell>
            <Suspense fallback={
                <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-card p-8 text-center">
                    <p className="text-muted text-sm">Loading...</p>
                </div>
            }>
                <AcceptContent />
            </Suspense>
        </FocusShell>
    )
}
