'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PRIVILEGE_LABELS: Record<string, string> = {
    co_organiser: 'Co-organiser',
    event_manager: 'Event Manager',
    door_staff: 'Door Staff',
}

function AcceptContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    type State = 'loading' | 'invalid' | 'already_accepted' | 'needs_login' | 'ready' | 'accepting' | 'success' | 'error'
    const [state, setState] = useState<State>('loading')
    const [orgName, setOrgName] = useState('')
    const [privilege, setPrivilege] = useState('')
    const [memberId, setMemberId] = useState('')

    useEffect(() => {
        if (!token) { setState('invalid'); return }

        async function check() {
            const supabase = createClient()

            // Look up invite
            const { data: invite } = await supabase
                .from('organiser_team')
                .select('id, privilege, status, organiser:organiser_profiles!organiser_id(org_name)')
                .eq('invite_token', token!)
                .maybeSingle()

            if (!invite) { setState('invalid'); return }
            if (invite.status === 'active') { setState('already_accepted'); return }
            if (invite.status === 'removed') { setState('invalid'); return }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const org = invite.organiser as any
            setOrgName(org?.org_name || 'this organiser')
            setPrivilege(invite.privilege)
            setMemberId(invite.id)

            // Check auth
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setState('needs_login')
                return
            }

            setState('ready')
        }

        check()
    }, [token])

    async function handleAccept() {
        setState('accepting')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setState('needs_login'); return }

        const { error } = await supabase
            .from('organiser_team')
            .update({ status: 'active', user_id: user.id, accepted_at: new Date().toISOString() })
            .eq('id', memberId)

        if (error) { setState('error'); return }
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

    if (state === 'needs_login') {
        return (
            <div style={containerStyle}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Sign In Required</h1>
                <p style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
                    You&apos;ve been invited to join <strong>{orgName}</strong> as <strong>{PRIVILEGE_LABELS[privilege] || privilege}</strong>.
                </p>
                <p style={{ color: '#8888AA', fontSize: 13, marginBottom: 24 }}>
                    Please sign in (or create an account) to accept this invitation.
                </p>
                <button
                    onClick={() => router.push(`/auth/login?next=${encodeURIComponent(`/team/accept?token=${token}`)}`)}
                    style={{ display: 'inline-block', background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                    Sign In to Accept
                </button>
            </div>
        )
    }

    if (state === 'success') {
        const isScanner = privilege === 'door_staff'
        return (
            <div style={containerStyle}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#0A0A0F', marginBottom: 12 }}>Welcome to the team!</h1>
                <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>
                    You have joined <strong>{orgName}</strong> as <strong>{PRIVILEGE_LABELS[privilege] || privilege}</strong>.
                </p>
                <Link
                    href={isScanner ? '/checkin' : '/organiser'}
                    style={{ display: 'inline-block', background: '#0A0A0F', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                    {isScanner ? 'Go to Check-in Scanner' : 'Go to Organiser Portal'}
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
                {privilege === 'door_staff' && 'You will have access to the ticket scanner for check-in.'}
                {privilege === 'event_manager' && 'You will be able to manage events, bookings and attendees.'}
                {privilege === 'co_organiser' && 'You will have full access to the organiser portal.'}
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
