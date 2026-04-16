'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

    const containerStyle: React.CSSProperties = {
        maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center',
    }

    if (state === 'loading') {
        return (
            <div style={containerStyle}>
                <p style={{ color: '#8888AA', fontSize: 15 }}>Verifying invitation...</p>
            </div>
        )
    }

    if (state === 'invalid') {
        return (
            <div style={containerStyle}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Invalid Invitation</h1>
                <p style={{ color: '#8888AA', fontSize: 15, marginBottom: 24 }}>This invitation link is invalid or has expired.</p>
                <Link href="/" style={{ color: '#0A0A0F', fontSize: 14, textDecoration: 'underline' }}>Return to homepage</Link>
            </div>
        )
    }

    if (state === 'wrong_account') {
        return (
            <div style={containerStyle}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Wrong Account</h1>
                <p style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
                    This invitation was sent to <strong>{invitedEmail}</strong>.
                </p>
                <p style={{ color: '#8888AA', fontSize: 13, marginBottom: 24 }}>
                    Please sign in with the correct account to accept it.
                </p>
                <button
                    onClick={() => router.replace(`/auth/login?next=${encodeURIComponent(`/team/accept?token=${token}`)}`)}
                    style={{ display: 'inline-block', background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                    Sign In with Correct Account
                </button>
            </div>
        )
    }

    if (state === 'already_accepted') {
        return (
            <div style={containerStyle}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Already Accepted</h1>
                <p style={{ color: '#8888AA', fontSize: 15, marginBottom: 24 }}>You have already accepted this invitation.</p>
                <Link href="/organiser" style={{ display: 'inline-block', background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    Go to Organiser Portal
                </Link>
            </div>
        )
    }


    if (state === 'success') {
        return (
            <div style={containerStyle}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Welcome to the team!</h1>
                <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>
                    You have joined <strong>{orgName}</strong> as <strong>Door Staff</strong>.
                </p>
                <Link
                    href="/checkin"
                    style={{ display: 'inline-block', background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                    Go to Check-in Scanner
                </Link>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div style={containerStyle}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#E63950', marginBottom: 12 }}>Something went wrong</h1>
                <p style={{ color: '#8888AA', fontSize: 15, marginBottom: 24 }}>Failed to accept the invitation. Please try again.</p>
                <button onClick={() => setState('ready')} style={{ background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Try Again
                </button>
            </div>
        )
    }

    // ready or accepting
    return (
        <div style={containerStyle}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Team Invitation</h1>
            <p style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
                You&apos;ve been invited to join <strong>{orgName}</strong> as <strong>{PRIVILEGE_LABELS[privilege] || privilege}</strong>.
            </p>
            <p style={{ color: '#8888AA', fontSize: 13, marginBottom: 32 }}>
                You will have access to the ticket scanner for check-in.
            </p>
            <button
                onClick={handleAccept}
                disabled={state === 'accepting'}
                style={{ background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, border: 'none', cursor: state === 'accepting' ? 'not-allowed' : 'pointer', opacity: state === 'accepting' ? 0.7 : 1 }}
            >
                {state === 'accepting' ? 'Accepting...' : 'Accept Invitation'}
            </button>
        </div>
    )
}

export default function TeamAcceptPage() {
    return (
        <Suspense fallback={
            <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
                <p style={{ color: '#8888AA' }}>Loading...</p>
            </div>
        }>
            <AcceptContent />
        </Suspense>
    )
}
