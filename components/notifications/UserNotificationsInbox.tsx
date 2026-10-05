'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { NOTIFICATIONS_UPDATED_EVENT, type NotificationRow } from '@/components/notifications/NotificationsInbox'

// Customer-account inbox. The shared NotificationsInbox (admin / promoter) is left untouched.

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
    if (d === 1) return '1 day ago'
    if (d < 30) return `${d} days ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const

// Icon chip per notification type (matched loosely, since new types get added over time)
function typeVisual(type: string): { chip: string; icon: React.ReactNode } {
    const t = type.toLowerCase()
    if (t.includes('refund')) {
        return { chip: 'bg-warm-amber/15 text-warm-amberText', icon: <svg {...ico}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg> }
    }
    if (t.includes('booking') || t.includes('confirm') || t.includes('ticket') || t.includes('order')) {
        return { chip: 'bg-warm-green/15 text-warm-green', icon: <svg {...ico}><path d="m5 13 4 4L19 7" /></svg> }
    }
    if (t.includes('reminder') || t.includes('event_')) {
        return { chip: 'bg-warm-red/15 text-warm-red', icon: <svg {...ico}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg> }
    }
    if (t.includes('follow') || t.includes('new_event') || t.includes('organiser')) {
        return { chip: 'bg-warm-orange/15 text-warm-orange', icon: <svg {...ico}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg> }
    }
    return { chip: 'bg-border text-muted', icon: <svg {...ico}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg> }
}

export function UserNotificationsInbox({ initial }: { initial: NotificationRow[] }) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<NotificationRow[]>(initial)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [busy, setBusy] = useState(false)
    const [confirmClearAll, setConfirmClearAll] = useState(false)

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications])
    const visible = useMemo(
        () => (filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications),
        [notifications, filter],
    )

    async function send(method: 'PATCH' | 'DELETE', body: Record<string, unknown>) {
        await fetch('/api/notifications', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        broadcastUpdate()
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
        <section className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                    <h1 className="font-heading text-3xl tracking-wide">NOTIFICATIONS</h1>
                    <p className="text-muted text-sm mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={markAllRead} disabled={busy || unreadCount === 0} className={`${textBtn} text-accent hover:underline`}>
                        Mark all as read
                    </button>
                    <span className="text-border">·</span>
                    <button onClick={clearRead} disabled={busy || notifications.every(n => !n.is_read)} className={`${textBtn} text-muted hover:text-text`}>
                        Clear read
                    </button>
                    <span className="text-border">·</span>
                    <button onClick={() => setConfirmClearAll(true)} disabled={busy || notifications.length === 0} className={`${textBtn} text-muted hover:text-accent`}>
                        Clear all
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 border-b border-border mb-5 text-sm font-semibold">
                {(['all', 'unread'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`pb-3 border-b-2 transition ${filter === t ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border">
                    <p className="text-muted text-sm">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map(n => {
                        const v = typeVisual(n.type)
                        return (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 bg-card rounded-xl border shadow-soft p-4 relative ${n.is_read ? 'border-border' : 'border-warm-red/30'}`}
                            >
                                {!n.is_read && <span aria-hidden className="absolute top-4 right-12 w-2 h-2 rounded-full bg-accent" />}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${v.chip}`}>{v.icon}</div>
                                <button onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left">
                                    <p className={`text-sm ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</p>
                                    {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2 break-words">{n.body}</p>}
                                    <p className="text-[11px] text-muted mt-1">{timeAgo(n.created_at)}</p>
                                </button>
                                <button
                                    onClick={() => deleteOne(n.id)}
                                    title="Delete"
                                    aria-label="Delete notification"
                                    className="text-muted hover:text-accent transition-colors p-1 shrink-0"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18" />
                                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {confirmClearAll && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmClearAll(false)}>
                    <div className="bg-card rounded-2xl shadow-hover p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="font-heading text-xl tracking-wide mb-2">CLEAR ALL NOTIFICATIONS?</h3>
                        <p className="text-sm text-muted mb-5">
                            This will permanently delete all {notifications.length} notification{notifications.length === 1 ? '' : 's'}. This can&apos;t be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={clearAll} disabled={busy} className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                                {busy ? 'Clearing…' : 'Clear all'}
                            </button>
                            <button onClick={() => setConfirmClearAll(false)} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
