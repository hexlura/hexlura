'use client'

import { useState } from 'react'

interface NotifyFollowersButtonProps {
    eventId: string
    initialNotifiedAt: string | null
    /** 'hero' = white-on-gradient style used in the event overview header */
    variant?: 'default' | 'hero'
}

export function NotifyFollowersButton({ eventId, initialNotifiedAt, variant = 'default' }: NotifyFollowersButtonProps) {
    const hero = variant === 'hero'
    const [notifiedAt, setNotifiedAt] = useState(initialNotifiedAt)
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleClick() {
        if (!confirm('Notify all your followers about this event? They’ll get a notification and, unless they’ve opted out, an email. This can only be done once per event.')) return

        setLoading(true)
        setMsg(null)
        const res = await fetch(`/api/organiser/events/${eventId}/notify-followers`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setMsg({ type: 'error', text: json.error || 'Failed to notify followers.' })
        } else {
            setNotifiedAt(new Date().toISOString())
            setMsg({ type: 'success', text: `Notified ${json.notified} follower${json.notified === 1 ? '' : 's'} (${json.emailed} emailed).` })
        }
        setLoading(false)
    }

    if (notifiedAt) {
        return (
            <p className={`text-xs ${hero ? 'text-white/90' : 'text-muted'}`}>
                Followers notified on {new Date(notifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
        )
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={hero
                    ? 'bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/30 hover:bg-white/25 transition-colors disabled:opacity-60'
                    : 'h-9 px-4 rounded-sm border border-border text-text text-sm hover:bg-card transition disabled:opacity-60'}
            >
                {loading ? 'Notifying…' : hero ? 'Notify Followers' : 'Notify My Followers'}
            </button>
            {msg && (
                <p className={`text-xs mt-1 ${hero ? 'text-white' : msg.type === 'success' ? 'text-success' : 'text-accent'}`}>{msg.text}</p>
            )}
        </div>
    )
}
