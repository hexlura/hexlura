'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PromoteState = 'none' | 'requested' | 'active' | 'invited'

interface PromoteEventButtonProps {
    eventId: string
    initialState: PromoteState
    isLoggedIn: boolean
}

// "Promote this event" — self-service promoter request. The server page
// precomputes initialState from the viewer's own assignment row; declined
// requests and the event's own organiser never render this button at all.
export default function PromoteEventButton({ eventId, initialState, isLoggedIn }: PromoteEventButtonProps) {
    const router = useRouter()
    const [state, setState] = useState<PromoteState>(initialState)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleRequest() {
        if (!isLoggedIn) {
            router.push('/auth/login')
            return
        }
        if (loading) return
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/promoter/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && (data.status === 'requested' || data.status === 'active' || data.status === 'invited')) {
                setState(data.status)
            } else {
                setError(data.error || 'Could not send request — please try again')
            }
        } catch {
            setError('Could not send request — please try again')
        }
        setLoading(false)
    }

    const baseStyle: React.CSSProperties = {
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: '2px',
        whiteSpace: 'nowrap',
        background: '#FFFFFF',
        color: '#0A0A0F',
        border: '1px solid #E4E4E7',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    }

    if (state === 'active') {
        return (
            <Link
                href="/promoter/links"
                style={{
                    ...baseStyle,
                    textDecoration: 'none',
                }}
            >
                Promoting · Get link
            </Link>
        )
    }

    if (state === 'requested') {
        return (
            <span
                title="The organiser will review your request"
                style={{
                    ...baseStyle,
                    cursor: 'default',
                    gap: '4px',
                }}
            >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                </svg>

                Requested
            </span>
        )
    }

    if (state === 'invited') {
        return (
            <span
                title="You already have an invitation for this event — check your email"
                style={{
                    ...baseStyle,
                    cursor: 'default',
                }}
            >
                Invite pending
            </span>
        )
    }

    return (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <button
                onClick={handleRequest}
                disabled={loading}
                title="Ask the organiser for a commission link to promote this event"
                style={{
                    ...baseStyle,
                    cursor: loading ? 'default' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                }}
            >
                {loading ? 'Sending…' : 'Promote'}
            </button>
            {error && <span style={{ fontSize: '11px', color: '#E63950', maxWidth: '180px' }}>{error}</span>}
        </span>
    )
}
