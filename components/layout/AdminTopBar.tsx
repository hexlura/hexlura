'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

// Where a top-bar search can jump to. Each of these admin pages already filters on ?q=.
const SEARCH_TARGETS = [
    { href: '/admin/users', label: 'Users', hint: 'name or email' },
    { href: '/admin/events', label: 'Events', hint: 'event title' },
    { href: '/admin/bookings', label: 'Bookings', hint: 'booking ref' },
] as const

// Desktop top bar for the admin portal: quick search, notifications bell and ADMIN tag.
export function AdminTopBar({ userId }: { userId: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const [unread, setUnread] = useState(0)
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const boxRef = useRef<HTMLDivElement>(null)

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

    // Close the menu on outside click
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [])

    const trimmed = query.trim()

    function go(index: number) {
        if (!trimmed) return
        const target = SEARCH_TARGETS[index]
        setOpen(false)
        router.push(`${target.href}?q=${encodeURIComponent(trimmed)}`)
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive(i => (i + 1) % SEARCH_TARGETS.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive(i => (i - 1 + SEARCH_TARGETS.length) % SEARCH_TARGETS.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            go(active)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className="hidden lg:flex sticky top-0 z-10 bg-[#FAF6F3]/80 backdrop-blur border-b border-border px-10 py-3.5 items-center justify-between gap-4">
            <div ref={boxRef} className="relative w-80">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Search users, events, bookings…"
                    aria-label="Search the admin portal"
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted shadow-soft focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                />
                {open && trimmed.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-hover overflow-hidden z-20">
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest text-muted">SEARCH &ldquo;{trimmed.length > 30 ? `${trimmed.slice(0, 30)}…` : trimmed}&rdquo; IN</p>
                        {SEARCH_TARGETS.map((t, i) => (
                            <button
                                key={t.href}
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(i)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${i === active ? 'bg-[#FAF6F3]' : ''}`}
                            >
                                <span className="font-semibold">{t.label}</span>
                                <span className="text-xs text-muted">{t.hint}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
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
                <span className="text-[11px] font-bold tracking-wider text-accent bg-warm-red/10 rounded-full px-3 py-1.5">ADMIN</span>
            </div>
        </div>
    )
}
