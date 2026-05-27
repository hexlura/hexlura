'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface Notification {
    id: string
    type: string
    title: string
    body: string
    is_read: boolean
    link: string | null
    created_at: string
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname() || ''

    // Route the "View all" link to the inbox inside whichever portal the user
    // is currently in, so the sidebar / dashboard context stays visible.
    const inboxHref =
        pathname.startsWith('/admin') ? '/admin/notifications' :
        pathname.startsWith('/organiser') ? '/organiser/notifications' :
        pathname.startsWith('/promoter') ? '/promoter/notifications' :
        '/notifications'

    async function load() {
        const res = await fetch('/api/notifications')
        if (!res.ok) return
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
    }

    useEffect(() => {
        if (userId) load()
    }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Close on outside click
    useEffect(() => {
        if (!open) return
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    async function markRead(id: string) {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    async function markAllRead() {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        })
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    async function handleClick(n: Notification) {
        if (!n.is_read) await markRead(n.id)
        setOpen(false)
        if (n.link) router.push(n.link)
    }

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                className="p-1 hover:opacity-70 transition-opacity text-[#0A0A0F]"
                aria-label="Notifications"
                style={{ position: 'relative' }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: '#E63950',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 340,
                    maxWidth: 'calc(100vw - 24px)',
                    background: '#FFFFFF',
                    border: '1px solid #E0E0E8',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #E0E0E8' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>Notifications</p>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{ fontSize: 12, color: '#E63950', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <p style={{ fontSize: 13, color: '#8888AA', textAlign: 'center', padding: '32px 16px', margin: 0 }}>
                                No notifications
                            </p>
                        ) : (
                            notifications.slice(0, 8).map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #F0F0F8',
                                        background: n.is_read ? 'transparent' : 'rgba(230,57,80,0.04)',
                                        borderLeft: n.is_read ? '3px solid transparent' : '3px solid #E63950',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F7')}
                                    onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(230,57,80,0.04)')}
                                >
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0F', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {n.title}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#666677', margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {n.body}
                                    </p>
                                    <p style={{ fontSize: 11, color: '#8888AA', margin: 0 }}>{timeAgo(n.created_at)}</p>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer — link to full inbox */}
                    <div style={{ borderTop: '1px solid #E0E0E8', textAlign: 'center' }}>
                        <Link
                            href={inboxHref}
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'block',
                                padding: '10px 16px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#E63950',
                                textDecoration: 'none',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}
                        >
                            View all notifications →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
