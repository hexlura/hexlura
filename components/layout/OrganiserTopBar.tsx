'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrganiserSearch } from '@/components/layout/OrganiserSearch'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

interface Notification {
    id: string
    type: string
    title: string
    body: string
    is_read: boolean
    link: string | null
    created_at: string
}

interface OrganiserTopBarProps {
    userId: string
    userName: string
    orgName: string
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function OrganiserTopBar({ userId, userName, orgName }: OrganiserTopBarProps) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    async function load() {
        try {
            const res = await fetch('/api/notifications')
            if (!res.ok) return
            const data = await res.json()
            setNotifications(data.notifications || [])
            setUnreadCount(data.unreadCount || 0)
        } catch (e) {
            console.error('[OrganiserTopBar] notifications fetch failed:', e)
        }
    }

    useEffect(() => {
        if (!userId) return
        load()
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, load)
        return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, load)
    }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Close on outside click
    useEffect(() => {
        if (!open) return
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    async function markRead(id: string) {
        const res = await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        if (!res.ok) return
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    async function markAllRead() {
        const res = await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        })
        if (!res.ok) return
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    async function handleClick(n: Notification) {
        if (!n.is_read) await markRead(n.id)
        setOpen(false)
        if (n.link) router.push(n.link)
    }

    async function handleSignOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const displayName = orgName || userName || 'Organiser'

    return (
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-between gap-4 px-10 py-4 bg-[#FAF6F3]/80 backdrop-blur border-b border-border">
            <OrganiserSearch />
            <div className="flex items-center gap-3">
            {/* Notifications */}
            <div ref={panelRef} className="relative">
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                    aria-label="Notifications"
                    className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-text shadow-soft"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-hover overflow-hidden z-40">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <p className="text-sm font-semibold">Notifications</p>
                            {unreadCount > 0 && (
                                <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-accent hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-border">
                            {notifications.length === 0 ? (
                                <p className="text-xs text-muted text-center py-8">No notifications</p>
                            ) : (
                                notifications.slice(0, 8).map(n => (
                                    <button
                                        key={n.id}
                                        type="button"
                                        onClick={() => handleClick(n)}
                                        className="w-full text-left flex items-start gap-3 p-4 hover:bg-background transition-colors"
                                    >
                                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-accent'}`} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold leading-snug truncate">{n.title}</p>
                                            <p className="text-xs text-muted leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                                            <p className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <Link
                            href="/organiser/notifications"
                            onClick={() => setOpen(false)}
                            className="block text-center text-xs font-semibold text-accent py-3 border-t border-border hover:bg-background transition-colors"
                        >
                            View all notifications →
                        </Link>
                    </div>
                )}
            </div>

            {/* Profile chip */}
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl pl-1.5 pr-3.5 py-1.5 shadow-soft">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white text-xs font-bold">
                    {initials(displayName)}
                </div>
                <div className="leading-tight">
                    <p className="text-xs font-semibold max-w-[160px] truncate">{displayName}</p>
                    <p className="text-[10px] text-muted">Organiser</p>
                </div>
            </div>

            {/* Sign out */}
            <button
                type="button"
                title="Sign out"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-accent hover:border-warm-red/30 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                </svg>
            </button>
            </div>
        </div>
    )
}
