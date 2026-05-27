'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export type NotificationRow = {
    id: string
    type: string
    title: string
    body: string
    is_read: boolean
    link: string | null
    created_at: string
}

// Sidebars listen for this event to refresh their unread badge after the
// user mutates notifications without navigating.
export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated'
function broadcastUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
    }
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotificationsInbox({ initial }: { initial: NotificationRow[] }) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<NotificationRow[]>(initial)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [busy, setBusy] = useState(false)
    const [confirmClearAll, setConfirmClearAll] = useState(false)

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.is_read).length,
        [notifications],
    )

    const visible = useMemo(
        () => filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications,
        [notifications, filter],
    )

    async function markRead(id: string) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        broadcastUpdate()
    }

    async function markAllRead() {
        if (unreadCount === 0) return
        setBusy(true)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        })
        setBusy(false)
        broadcastUpdate()
    }

    async function deleteOne(id: string) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        await fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        broadcastUpdate()
    }

    async function clearRead() {
        setBusy(true)
        setNotifications(prev => prev.filter(n => !n.is_read))
        await fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
        })
        setBusy(false)
        broadcastUpdate()
    }

    async function clearAll() {
        setBusy(true)
        setNotifications([])
        setConfirmClearAll(false)
        await fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        })
        setBusy(false)
        broadcastUpdate()
    }

    function handleClick(n: NotificationRow) {
        if (!n.is_read) void markRead(n.id)
        if (n.link) router.push(n.link)
    }

    return (
        <section className="max-w-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">NOTIFICATIONS</h1>
                    <p className="text-muted text-sm mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={markAllRead}
                        disabled={busy || unreadCount === 0}
                        className="text-xs px-3 py-1.5 border border-border rounded-sm text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Mark all read
                    </button>
                    <button
                        onClick={clearRead}
                        disabled={busy || notifications.every(n => !n.is_read)}
                        className="text-xs px-3 py-1.5 border border-border rounded-sm text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Clear read
                    </button>
                    <button
                        onClick={() => setConfirmClearAll(true)}
                        disabled={busy || notifications.length === 0}
                        className="text-xs px-3 py-1.5 border border-accent/40 text-accent hover:bg-accent/10 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Clear all
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                {(['all', 'unread'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-4 py-2 text-sm transition-colors -mb-px border-b-2 ${
                            filter === t
                                ? 'text-text border-accent'
                                : 'text-muted border-transparent hover:text-text'
                        }`}
                    >
                        {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </button>
                ))}
            </div>

            <div className="bg-card border border-border">
                {visible.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted text-sm">
                            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {visible.map(n => (
                            <li
                                key={n.id}
                                className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface ${
                                    n.is_read ? '' : 'bg-accent/5'
                                }`}
                            >
                                <span
                                    aria-hidden
                                    className={`mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                        n.is_read ? 'bg-transparent' : 'bg-accent'
                                    }`}
                                />
                                <button
                                    onClick={() => handleClick(n)}
                                    className="flex-1 min-w-0 text-left"
                                >
                                    <p className={`text-sm truncate ${n.is_read ? 'text-text' : 'text-text font-semibold'}`}>
                                        {n.title}
                                    </p>
                                    {n.body && (
                                        <p className="text-xs text-muted mt-0.5 line-clamp-2 break-words">{n.body}</p>
                                    )}
                                    <p className="text-[11px] text-muted mt-1">{timeAgo(n.created_at)}</p>
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {!n.is_read && (
                                        <button
                                            onClick={() => markRead(n.id)}
                                            title="Mark as read"
                                            className="text-[10px] uppercase tracking-wider text-muted hover:text-text px-2 py-1 transition-colors"
                                        >
                                            Read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteOne(n.id)}
                                        title="Delete"
                                        aria-label="Delete notification"
                                        className="text-muted hover:text-accent transition-colors p-1"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18" />
                                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Confirm Clear All */}
            {confirmClearAll && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setConfirmClearAll(false)}
                >
                    <div
                        className="bg-card border border-border p-6 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="font-heading text-xl text-text mb-2">Clear all notifications?</h3>
                        <p className="text-sm text-muted mb-4">
                            This will permanently delete all {notifications.length} notification{notifications.length === 1 ? '' : 's'}. This can&apos;t be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={clearAll}
                                disabled={busy}
                                className="px-4 py-2 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
                            >
                                {busy ? 'Clearing…' : 'Clear all'}
                            </button>
                            <button
                                onClick={() => setConfirmClearAll(false)}
                                className="px-4 py-2 border border-border text-sm text-text hover:bg-surface transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
