'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'
import { ENQUIRIES_UPDATED_EVENT } from '@/lib/contact'

type BadgeKey = 'pendingOrganisers' | 'openSupportTickets' | 'unreadNotifications' | 'unreadEnquiries'

interface AdminSidebarProps {
    adminName: string
    userId: string
    pendingOrganisers: number
    openSupportTickets: number
}

type IconKey =
    | 'dash' | 'users' | 'org' | 'promo' | 'events' | 'book' | 'trash' | 'chart' | 'card' | 'refund'
    | 'mail' | 'bell' | 'help' | 'pin' | 'tag' | 'palette' | 'search' | 'doc' | 'toggle' | 'cog' | 'log'

interface NavLink {
    href: string
    label: string
    exact: boolean
    icon: IconKey
    badge?: BadgeKey
}

const ICONS: Record<IconKey, React.ReactNode> = {
    dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 8.5a3 3 0 1 1 3.2 3M21.5 20c0-2.8-2-5-4.5-5.6" /></>,
    org: <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />,
    promo: <path d="M4 20V10M12 20V4M20 20v-7" />,
    events: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
    book: <path d="M4 4h16v4H4zM4 12h10M4 16h16M4 20h10" />,
    trash: <path d="M3 6h18M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-5 3 3 5-7" /></>,
    card: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></>,
    refund: <><path d="M3 12a9 9 0 1 1 2.6 6.3" /><path d="M3 21v-5h5" /></>,
    mail: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    help: <><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.8-2.3 3.5" /><path d="M12 17h.01" /></>,
    pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    tag: <><path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-7.4-7.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
    palette: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16" cy="10" r="1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    doc: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 13h6M9 17h6" /></>,
    toggle: <><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="2.5" /></>,
    cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" /></>,
    log: <path d="M4 6h16M4 12h16M4 18h10" />,
}

const NAV_SECTIONS: { title: string; links: NavLink[] }[] = [
    {
        title: 'MAIN',
        links: [
            { href: '/admin', label: 'Dashboard', exact: true, icon: 'dash' },
            { href: '/admin/users', label: 'Users', exact: false, icon: 'users' },
            { href: '/admin/organisers', label: 'Organisers', exact: false, icon: 'org', badge: 'pendingOrganisers' },
            { href: '/admin/promoters', label: 'Promoters', exact: false, icon: 'promo' },
            { href: '/admin/events', label: 'Events', exact: false, icon: 'events' },
            { href: '/admin/bookings', label: 'Bookings', exact: false, icon: 'book' },
            { href: '/admin/event-deletion-requests', label: 'Event Deletions', exact: false, icon: 'trash' },
            { href: '/admin/account-deletion-requests', label: 'Account Deletions', exact: false, icon: 'trash' },
        ],
    },
    {
        title: 'FINANCE',
        links: [
            { href: '/admin/financials', label: 'Financials', exact: false, icon: 'chart' },
            { href: '/admin/payouts', label: 'Payouts', exact: false, icon: 'card' },
            { href: '/admin/refunds', label: 'Refunds', exact: false, icon: 'refund' },
        ],
    },
    {
        title: 'SUPPORT',
        links: [
            { href: '/admin/support/enquiries', label: 'Enquiries', exact: false, icon: 'mail', badge: 'unreadEnquiries' },
            { href: '/admin/notifications', label: 'Notifications', exact: false, icon: 'bell', badge: 'unreadNotifications' },
            { href: '/admin/support', label: 'Support', exact: true, icon: 'help', badge: 'openSupportTickets' },
        ],
    },
    {
        title: 'PLATFORM',
        links: [
            { href: '/admin/cities', label: 'Cities', exact: false, icon: 'pin' },
            { href: '/admin/categories', label: 'Categories', exact: false, icon: 'tag' },
            { href: '/admin/design', label: 'Design', exact: false, icon: 'palette' },
            { href: '/admin/seo', label: 'SEO', exact: false, icon: 'search' },
            { href: '/admin/legal', label: 'Legal Pages', exact: false, icon: 'doc' },
            { href: '/admin/page-controls', label: 'Page Controls', exact: false, icon: 'toggle' },
            { href: '/admin/settings', label: 'Settings', exact: false, icon: 'cog' },
            { href: '/admin/audit-log', label: 'Audit Log', exact: false, icon: 'log' },
        ],
    },
]

export function AdminSidebar({ adminName, userId, pendingOrganisers, openSupportTickets }: AdminSidebarProps) {
    const [unreadNotifications, setUnreadNotifications] = useState(0)
    const [unreadEnquiries, setUnreadEnquiries] = useState(0)

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const refresh = () => {
            fetch('/api/notifications')
                .then(r => r.ok ? r.json() : { unreadCount: 0 })
                .then(d => { if (!cancelled) setUnreadNotifications(d.unreadCount || 0) })
                .catch(() => { })
        }
        refresh()
        // Live-update when the inbox page mutates notifications.
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        }
    }, [userId])

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const refresh = () => {
            fetch('/api/admin/contact-enquiries')
                .then(r => r.ok ? r.json() : { unreadCount: 0 })
                .then(d => { if (!cancelled) setUnreadEnquiries(d.unreadCount || 0) })
                .catch(() => { })
        }
        refresh()
        // Live-update when the enquiries page marks an enquiry read/unread.
        window.addEventListener(ENQUIRIES_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(ENQUIRIES_UPDATED_EVENT, refresh)
        }
    }, [userId])

    const badgeCounts: Record<BadgeKey, number> = {
        pendingOrganisers,
        openSupportTickets,
        unreadNotifications,
        unreadEnquiries,
    }
    const pathname = usePathname()
    const router = useRouter()
    const [loadingPath, setLoadingPath] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setLoadingPath('')
        setIsOpen(false)
    }, [pathname])

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href
        return pathname.startsWith(href)
    }

    const handleNavClick = (href: string) => {
        setLoadingPath(href)
        setIsOpen(false)
    }

    const [signingOut, setSigningOut] = useState(false)

    const handleSignOut = async () => {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const initials = adminName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || 'AD'

    return (
        <>
            {/* Admin bottom nav — mobile only */}
            <AdminBottomNav
                pendingOrganisers={pendingOrganisers}
                onMoreClick={() => setIsOpen(true)}
            />

            {/* Mobile header bar — hidden on desktop */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-wider text-xl">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="text-muted hover:text-accent transition-colors p-2 disabled:opacity-50"
                        type="button"
                        aria-label="Sign out"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
                    </button>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="text-text p-2 -mr-2"
                        type="button"
                        aria-label="Open menu"
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    aria-hidden="true"
                />
            )}

            {/* Sidebar — slides in from RIGHT on mobile, fixed left on desktop */}
            <aside
                className={[
                    'fixed inset-y-0 z-50 flex flex-col overflow-hidden bg-white/90 backdrop-blur border-l border-border w-64',
                    'transform transition-transform duration-300 ease-in-out',
                    'lg:left-0 lg:border-r lg:border-l-0 lg:translate-x-0',
                    'right-0',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
            >
                {/* X close button — mobile only */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden absolute top-4 right-4 text-muted hover:text-text transition-colors"
                    type="button"
                    aria-label="Close menu"
                >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="5" x2="15" y2="15" />
                        <line x1="15" y1="5" x2="5" y2="15" />
                    </svg>
                </button>

                <Link href="/" className="block shrink-0 px-7 pt-5 pb-3">
                    <div className="font-heading text-2xl text-accent tracking-wider">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-0.5">Admin Portal</div>
                </Link>

                <nav className="flex-1 min-h-0 px-5 pb-4 overflow-y-auto text-sm">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title}>
                            <p className="text-[10px] font-bold tracking-[0.15em] text-[#6B5D56]/80 px-3 pt-4 pb-1.5">{section.title}</p>
                            <div className="flex flex-col gap-0.5">
                                {section.links.map((link) => {
                                    const active = isActive(link.href, link.exact)
                                    const loading = loadingPath === link.href
                                    const count = link.badge ? badgeCounts[link.badge] : 0
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => handleNavClick(link.href)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${active
                                                ? 'bg-text text-white font-medium shadow-[0_6px_18px_-4px_rgba(26,14,12,0.35)]'
                                                : 'text-muted hover:text-text hover:bg-background'
                                                }`}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                                {ICONS[link.icon]}
                                            </svg>
                                            {link.label}
                                            <span className="ml-auto flex items-center gap-1.5">
                                                {count > 0 && (
                                                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${active ? 'bg-white text-text' : 'bg-accent text-white'}`}>
                                                        {count > 99 ? '99+' : count}
                                                    </span>
                                                )}
                                                {loading && (
                                                    <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                )}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Admin footer — pb-20 on mobile clears the bottom nav */}
                <div className="shrink-0 px-5 py-4 pb-20 lg:pb-4 border-t border-border flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                    <div className="leading-tight min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{adminName}</p>
                        <p className="text-[10px] text-muted">Administrator</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        title="Sign out"
                        className="text-muted hover:text-accent transition-colors disabled:opacity-50"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
                    </button>
                </div>
            </aside>
        </>
    )
}
