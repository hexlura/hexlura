'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

// Desktop top bar for the promoter portal: notifications, profile chip, sign out.
export function PromoterTopBar({ userId, userName }: { userId: string; userName: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const [unread, setUnread] = useState(0)
    const [signingOut, setSigningOut] = useState(false)

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

    async function handleSignOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const initials = userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || 'P'

    return (
        <div className="hidden lg:flex sticky top-0 z-10 bg-[#FAF6F3]/80 backdrop-blur border-b border-border px-10 py-3.5 items-center justify-end gap-3">
            <Link
                href="/promoter/notifications"
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
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl pl-1.5 pr-3.5 py-1.5 shadow-soft">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                <div className="leading-tight">
                    <p className="text-xs font-semibold">{userName}</p>
                    <p className="text-[10px] text-muted">Promoter</p>
                </div>
            </div>
            <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Log out"
                className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-accent hover:border-warm-red/30 transition-colors shadow-soft disabled:opacity-50"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            </button>
        </div>
    )
}
