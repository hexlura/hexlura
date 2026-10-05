'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

// Desktop top bar for the admin portal: notifications bell + ADMIN tag.
export function AdminTopBar({ userId }: { userId: string }) {
    const pathname = usePathname()
    const [unread, setUnread] = useState(0)

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const refresh = () => {
            fetch('/api/notifications')
                .then(r => (r.ok ? r.json() : { unreadCount: 0 }))
                .then(d => { if (!cancelled) setUnread(d.unreadCount || 0) })
                .catch(() => {})
        }
        refresh()
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        }
    }, [userId, pathname])

    return (
        <div className="hidden lg:flex sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-10 py-3.5 items-center justify-end gap-3">
            <Link
                href="/admin/notifications"
                className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-text transition-colors relative shadow-soft"
                aria-label="Notifications"
            >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Link>
            <span className="text-[11px] font-bold tracking-wider text-accent bg-accent/10 rounded-full px-3 py-1.5">ADMIN</span>
        </div>
    )
}
