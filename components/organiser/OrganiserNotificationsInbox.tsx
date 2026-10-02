'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NOTIFICATIONS_UPDATED_EVENT, type NotificationRow } from '@/components/notifications/NotificationsInbox'

// Organiser-portal inbox. The shared NotificationsInbox (admin / promoter / user) is left untouched.

function broadcastUpdate() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
}

function timeAgo(iso: string): string {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'Yesterday'
    if (d < 30) return `${d} days ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const

// Icon chip per notification type (matched loosely, since new types get added over time)
function typeVisual(type: string): { chip: string; icon: React.ReactNode } {
    const t = type.toLowerCase()
    if (t.includes('refund')) {
        return { chip: 'bg-warm-yellow/10 text-warm-yellowText', icon: <svg {...svg}><path d="M3 12a9 9 0 1 1 2.6 6.3" /><path d="M3 21v-5h5" /></svg> }
    }
    if (t.includes('payout') || t.includes('payment') || t.includes('stripe')) {
        return { chip: 'bg-warm-green/10 text-warm-green', icon: <svg {...svg}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg> }
    }
    if (t.includes('booking') || t.includes('ticket') || t.includes('order') || t.includes('sale')) {
        return { chip: 'bg-warm-red/10 text-warm-red', icon: <svg {...svg}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> }
    }
    if (t.includes('team') || t.includes('invite') || t.includes('promoter')) {
        return { chip: 'bg-border text-muted', icon: <svg {...svg}><circle cx="12" cy="12" r="3.5" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg> }
    }
    return { chip: 'bg-border text-muted', icon: <svg {...svg}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg> }
}

export function OrganiserNotificationsInbox({ initial }: { initial: NotificationRow[] }) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<NotificationRow[]>(initial)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [busy, setBusy] = useState(false)
    const [confirmClearAll, setConfirmClearAll] = useState(false)
    const [error, setError] = useState('')

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications])
    const visible = useMemo(
        () => (filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications),
        [notifications, filter],
    )

    useEffect(() => {
        if (!confirmClearAll) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmClearAll(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [confirmClearAll])

    // Sends the change, and resyncs from the server if it did not go through
    async function send(method: 'PATCH' | 'DELETE', body: Record<string, unknown>): Promise<boolean> {
        try {
            const res = await fetch('/api/notifications', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error(`notifications ${method} ${res.status}`)
            setError('')
            broadcastUpdate()
            return true
        } catch (e) {
            console.error('[Notifications] update failed:', e)
            setError('That change could not be saved. Refreshing your notifications…')
            router.refresh()
            return false
        }
    }

    async function markRead(id: string) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
        await send('PATCH', { id })
    }

    async function markAllRead() {
        if (unreadCount === 0) return
        setBusy(true)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        await send('PATCH', { all: true })
        setBusy(false)
    }

    async function deleteOne(id: string) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        await send('DELETE', { id })
    }

    async function clearRead() {
        setBusy(true)
        setNotifications(prev => prev.filter(n => !n.is_read))
        await send('DELETE', { read: true })
        setBusy(false)
    }

    async function clearAll() {
        setBusy(true)
        setNotifications([])
        setConfirmClearAll(false)
        await send('DELETE', { all: true })
        setBusy(false)
    }

    function handleClick(n: NotificationRow) {
        if (!n.is_read) void markRead(n.id)
        if (n.link) router.push(n.link)
    }

    const textBtn = 'text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

    return (
        <div className="max-w-7xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">NOTIFICATIONS</h1>
                    <p className="text-muted text-sm mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={markAllRead} disabled={busy || unreadCount === 0} className={`${textBtn} text-accent hover:underline`}>
                        Mark all read
                    </button>
                    <span className="text-border">·</span>
                    <button type="button" onClick={clearRead} disabled={busy || notifications.every(n => !n.is_read)} className={`${textBtn} text-muted hover:text-text`}>
                        Clear read
                    </button>
                    <span className="text-border">·</span>
                    <button type="button" onClick={() => setConfirmClearAll(true)} disabled={busy || notifications.length === 0} className={`${textBtn} text-muted hover:text-accent`}>
                        Clear all
                    </button>
                </div>
            </div>

            {error && <p className="text-warm-red text-xs mb-3">{error}</p>}

            {/* Filter tabs */}
            <div className="flex gap-1 mb-4 border-b border-border">
                {(['all', 'unread'] as const).map(t => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setFilter(t)}
                        className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                            filter === t ? 'font-medium text-text border-accent' : 'text-muted border-transparent hover:text-text'
                        }`}
                    >
                        {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </button>
                ))}
            </div>

            <div className="bg-card rounded-2xl shadow-card divide-y divide-border overflow-hidden">
                {visible.length === 0 ? (
                    <p className="text-muted text-sm text-center py-16">
                        {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
                    </p>
                ) : (
                    visible.map(n => {
                        const v = typeVisual(n.type)
                        return (
                            <div key={n.id} className={`flex items-start gap-4 p-5 ${n.is_read ? '' : 'bg-[#E63950]/5'}`}>
                                <span aria-hidden className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.is_read ? '' : 'bg-accent'}`} />
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${v.chip}`}>{v.icon}</span>
                                <button type="button" onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left">
                                    <p className={`text-sm ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</p>
                                    {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2 break-words">{n.body}</p>}
                                    <p className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</p>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!n.is_read && (
                                        <button
                                            type="button"
                                            onClick={() => markRead(n.id)}
                                            title="Mark as read"
                                            className="text-[10px] uppercase tracking-wider text-muted hover:text-text px-2 py-1 transition-colors"
                                        >
                                            Read
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => deleteOne(n.id)}
                                        title="Delete"
                                        aria-label="Delete notification"
                                        className="text-muted hover:text-accent transition-colors p-1"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18" />
                                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Clear all confirm modal */}
            {confirmClearAll && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setConfirmClearAll(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-sm p-6">
                        <h2 className="font-heading text-xl tracking-wide mb-3">CLEAR ALL NOTIFICATIONS?</h2>
                        <p className="text-sm text-muted mb-5">
                            This will permanently delete all {notifications.length} notification{notifications.length === 1 ? '' : 's'}. This can&apos;t be undone.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={clearAll} disabled={busy} className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                                {busy ? 'Clearing…' : 'Clear all'}
                            </button>
                            <button type="button" onClick={() => setConfirmClearAll(false)} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
