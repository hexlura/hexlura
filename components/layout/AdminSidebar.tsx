'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

type BadgeKey = 'pendingOrganisers' | 'openSupportTickets' | 'unreadNotifications'

interface AdminSidebarProps {
    adminName: string
    userId: string
    pendingOrganisers: number
    openSupportTickets: number
}

interface NavLink {
    href: string
    label: string
    exact: boolean
    badge?: BadgeKey
}

const NAV_SECTIONS: { title: string; links: NavLink[] }[] = [
    {
        title: 'MAIN',
        links: [
            { href: '/admin', label: 'Dashboard', exact: true },
            { href: '/admin/users', label: 'Users', exact: false },
            { href: '/admin/organisers', label: 'Organisers', exact: false, badge: 'pendingOrganisers' },
            { href: '/admin/promoters', label: 'Promoters', exact: false },
            { href: '/admin/events', label: 'Events', exact: false },
            { href: '/admin/bookings', label: 'Bookings', exact: false },
        ],
    },
    {
        title: 'FINANCE',
        links: [
            { href: '/admin/financials', label: 'Financials', exact: false },
            { href: '/admin/payouts', label: 'Payouts', exact: false },
            { href: '/admin/refunds', label: 'Refunds', exact: false },
        ],
    },
    {
        title: 'SUPPORT',
        links: [
            { href: '/admin/support', label: 'Support', exact: false, badge: 'openSupportTickets' },
            { href: '/admin/notifications', label: 'Notifications', exact: false, badge: 'unreadNotifications' },
        ],
    },
    {
        title: 'PLATFORM',
        links: [
            { href: '/admin/cities', label: 'Cities', exact: false },
            { href: '/admin/categories', label: 'Categories', exact: false },
            { href: '/admin/design', label: 'Design', exact: false },
            { href: '/admin/seo', label: 'SEO', exact: false },
            { href: '/admin/settings', label: 'Settings', exact: false },
            { href: '/admin/audit-log', label: 'Audit Log', exact: false },
        ],
    },
]

export function AdminSidebar({ adminName, userId, pendingOrganisers, openSupportTickets }: AdminSidebarProps) {
    const [unreadNotifications, setUnreadNotifications] = useState(0)

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const refresh = () => {
            fetch('/api/notifications')
                .then(r => r.ok ? r.json() : { unreadCount: 0 })
                .then(d => { if (!cancelled) setUnreadNotifications(d.unreadCount || 0) })
                .catch(() => {})
        }
        refresh()
        // Live-update when the inbox page mutates notifications.
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        }
    }, [userId])

    const badgeCounts: Record<BadgeKey, number> = {
        pendingOrganisers,
        openSupportTickets,
        unreadNotifications,
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

    return (
        <>
            {/* Admin bottom nav — mobile only */}
            <AdminBottomNav
                pendingOrganisers={pendingOrganisers}
                onMoreClick={() => setIsOpen(true)}
            />

            {/* Mobile header bar — hidden on desktop */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#C0C0C8] flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-widest text-lg">HEXLURA</Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="text-[#666677] hover:text-accent transition-colors p-2 disabled:opacity-50"
                        type="button"
                        aria-label="Sign out"
                    >
                        {signingOut ? (
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="text-[#0A0A0F] p-2 -mr-2"
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
                    'fixed inset-y-0 z-50 flex flex-col overflow-hidden',
                    'transform transition-transform duration-300 ease-in-out',
                    'lg:left-0 lg:translate-x-0',
                    'right-0',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
                style={{ width: '240px', background: '#FFFFFF', borderLeft: '1px solid #C0C0C8' }}
            >
                {/* X close button — mobile only */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden absolute top-4 right-4 text-[#666677] hover:text-[#0A0A0F] transition-colors"
                    type="button"
                    aria-label="Close menu"
                >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="5" x2="15" y2="15" />
                        <line x1="15" y1="5" x2="5" y2="15" />
                    </svg>
                </button>

                <Link href="/" className="block px-6 py-5 border-b border-border flex-shrink-0 hover:bg-card transition-colors">
                    <div className="font-heading text-xl text-accent tracking-widest">HEXLURA</div>
                    <div className="text-xs text-muted mt-0.5">Admin Console</div>
                </Link>

                <nav className="flex-1 px-3 py-4 flex flex-col gap-5 overflow-y-auto min-h-0">
                    {NAV_SECTIONS.map((section, sectionIdx) => (
                        <div key={section.title} style={sectionIdx > 0 ? { borderTop: '1px solid #E0E0E8', paddingTop: 12 } : {}}>

                            <div className="flex flex-col gap-0.5">
                                {section.links.map((link) => {
                                    const active = isActive(link.href, link.exact)
                                    const loading = loadingPath === link.href
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => handleNavClick(link.href)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors relative text-left ${
                                                active
                                                    ? 'text-text bg-card font-medium'
                                                    : loading
                                                    ? 'text-muted'
                                                    : 'text-muted hover:text-text hover:bg-card'
                                            }`}
                                        >
                                            {active && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-accent" />
                                            )}
                                            <span className={active ? 'text-accent' : ''}>{link.label}</span>
                                            <span className="flex items-center gap-1.5">
                                                {link.badge && badgeCounts[link.badge] > 0 && (
                                                    <span className="text-[10px] font-bold bg-gold text-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                                        {badgeCounts[link.badge]}
                                                    </span>
                                                )}
                                                {loading && (
                                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
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

                <div className="p-4 border-t border-border flex-shrink-0">
                    <div className="text-sm text-text font-medium truncate mb-3">{adminName}</div>
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {signingOut ? (
                            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        {signingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                </div>
            </aside>
        </>
    )
}
