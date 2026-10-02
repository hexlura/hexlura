'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

interface OrganiserSidebarProps {
    userName: string
    orgName: string
    userId: string
    identityStatus?: 'processing' | 'verified' | 'requires_input' | 'canceled' | null
}

const navLinks = [
    {
        href: '/organiser',
        label: 'Dashboard',
        exact: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        ),
    },
    {
        href: '/organiser/events',
        label: 'My Events',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
        ),
    },
    {
        href: '/organiser/bookings',
        label: 'Bookings',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16v4H4zM4 12h10M4 16h16M4 20h10"/></svg>
        ),
    },
    {
        href: '/organiser/attendees',
        label: 'Attendees',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 8.5a3 3 0 1 1 3.2 3M21.5 20c0-2.8-2-5-4.5-5.6"/></svg>
        ),
    },
    {
        href: '/organiser/team',
        label: 'Team',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="8" r="3.5"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>
        ),
    },
    {
        href: '/organiser/promoters',
        label: 'Promoters',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
        ),
    },
    {
        href: '/organiser/email-lists',
        label: 'Email Lists',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
        ),
    },
    {
        href: '/organiser/campaigns',
        label: 'Promote via Email',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 11l18-7-7 18-2.5-7.5L3 11z"/></svg>
        ),
    },
    {
        href: '/organiser/portfolio',
        label: 'Portfolio',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        ),
    },
    {
        href: '/organiser/analytics',
        label: 'Analytics',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 3v18h18"/><path d="m7 14 4-5 3 3 5-7"/></svg>
        ),
    },
    {
        href: '/organiser/payouts',
        label: 'Payouts',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
        ),
    },
    {
        href: '/organiser/refunds',
        label: 'Refunds',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 12a9 9 0 1 1 2.6 6.3"/><path d="M3 21v-5h5"/></svg>
        ),
    },
    {
        href: '/organiser/promo-codes',
        label: 'Promo Codes',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-7.4-7.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>
        ),
    },
    {
        href: '/organiser/settings',
        label: 'Settings',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/></svg>
        ),
    },
    {
        href: '/organiser/support',
        label: 'Help & Support',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.8-2.3 3.5"/><path d="M12 17h.01"/></svg>
        ),
    },
    {
        href: '/organiser/notifications',
        label: 'Notifications',
        exact: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        ),
    },
]

export function OrganiserSidebar({ userName, orgName, userId, identityStatus = null }: OrganiserSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [loadingPath, setLoadingPath] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [unreadNotifications, setUnreadNotifications] = useState(0)

    useEffect(() => {
        setLoadingPath('')
        setIsOpen(false)
    }, [pathname])

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
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        }
    }, [userId, pathname])

    const visibleLinks = navLinks

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
            {/* Mobile header bar — hidden on desktop */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-wider text-xl">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></Link>
                <div className="flex items-center gap-2">
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
                    'fixed inset-y-0 z-50 flex flex-col bg-white/80 backdrop-blur border-l border-border w-64',
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

                {/* Logo */}
                <Link href="/" className="block shrink-0 px-7 pt-5 pb-4">
                    <div className="font-heading text-2xl text-accent tracking-wider">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></div>
                </Link>

                {/* Navigation — scrolls independently, pb-28 clears the mobile bottom nav */}
                <nav className="flex-1 min-h-0 px-5 pb-4 flex flex-col gap-0.5 overflow-y-auto">
                    {visibleLinks.map((link) => {
                        const active = isActive(link.href, link.exact)
                        const loading = loadingPath === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                                    active
                                        ? 'bg-text text-white font-medium shadow-[0_6px_18px_-4px_rgba(26,14,12,0.35)]'
                                        : loading
                                        ? 'text-muted'
                                        : 'text-muted hover:text-text hover:bg-background'
                                }`}
                            >
                                <span className="shrink-0">{link.icon}</span>
                                {link.label}
                                <span className="ml-auto flex items-center gap-1.5">
                                    {link.href === '/organiser/notifications' && unreadNotifications > 0 && (
                                        <span className="text-[10px] font-bold bg-accent text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
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

                    {/* My Account link — inside scroll area so it's reachable */}
                    <div className="border-t border-border mt-2 pt-2">
                        <Link
                            href="/account"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors text-muted hover:text-text hover:bg-background"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                                <circle cx="12" cy="8" r="3.5" />
                                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
                            </svg>
                            My Account
                        </Link>
                    </div>

                    {/* User footer — inside scroll area so Sign Out is reachable */}
                    <div className="pt-3 pb-2 mt-2 border-t border-border">
                        {/* Name + sign out live in the desktop top bar; shown here on mobile only */}
                        <div className="lg:hidden">
                            <div className="text-xs text-muted mb-0.5 truncate">{orgName}</div>
                            <div className="text-sm text-text font-medium truncate mb-2">{userName}</div>
                        </div>

                        {/* Identity verification status — clickable, links to settings */}
                        {(() => {
                            const target = '/organiser/settings#identity'
                            if (identityStatus === 'verified') {
                                return (
                                    <button
                                        onClick={() => handleNavClick(target)}
                                        className="w-full inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-warm-green bg-warm-green/10 border border-warm-green/30 hover:bg-warm-green/15 transition-colors"
                                        title="Identity verified — view in settings"
                                    >
                                        <span>✓</span>
                                        <span>Verified</span>
                                    </button>
                                )
                            }
                            if (identityStatus === 'processing') {
                                return (
                                    <button
                                        onClick={() => handleNavClick(target)}
                                        className="w-full inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-500 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/15 transition-colors"
                                        title="Identity verification in progress"
                                    >
                                        <span>⏳</span>
                                        <span>Verifying…</span>
                                    </button>
                                )
                            }
                            // null, requires_input, canceled — all surface as "Unverified" with the same CTA
                            return (
                                <button
                                    onClick={() => handleNavClick(target)}
                                    className="w-full inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-warm-red bg-warm-red/10 border border-warm-red/30 hover:bg-warm-red/15 transition-colors"
                                    title="Verify your identity to enable payouts"
                                >
                                    <span>⚠</span>
                                    <span>Unverified — verify now</span>
                                </button>
                            )
                        })()}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="lg:hidden flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                </nav>
                {/* Upgrade card — pinned to the bottom of the sidebar, outside the scrolling menu.
                    pb-20 on mobile clears the bottom nav bar. */}
                <div className="shrink-0 p-5 pt-3 pb-20 lg:pb-5 border-t border-border">
                    <div className="bg-gradient-to-br from-accent via-accent to-warm-orange rounded-2xl p-5 text-white shadow-glow relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">Free Plan</p>
                        <p className="text-sm mt-2 mb-4 leading-snug relative">Unlock lower fees, team seats &amp; promoter tools with Pro</p>
                        <Link
                            href="/organiser/billing"
                            onClick={() => setIsOpen(false)}
                            className="block text-center w-full bg-white text-text text-xs font-bold py-2.5 rounded-xl hover:bg-white/90 transition-colors relative"
                        >
                            Upgrade to Pro →
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    )
}
