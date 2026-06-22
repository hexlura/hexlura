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
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2 11l8-8 8 8v9H13v-6H7v6H2V11z" />
            </svg>
        ),
    },
    {
        href: '/organiser/events',
        label: 'My Events',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
            </svg>
        ),
    },
    {
        href: '/organiser/bookings',
        label: 'Bookings',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/attendees',
        label: 'Attendees',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
        ),
    },
    {
        href: '/organiser/team',
        label: 'Team',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM2 8a2 2 0 11-4 0 2 2 0 014 0zM16.5 17c0-2.485-2.015-4.5-4.5-4.5S7.5 14.515 7.5 17H16.5zM4 17a4.5 4.5 0 014.5-4.5c.17 0 .336.009.5.027A6.016 6.016 0 004 17zM18 17a6.016 6.016 0 00-5-5.473A4.5 4.5 0 0118 17z" />
            </svg>
        ),
    },
    {
        href: '/organiser/promoters',
        label: 'Promoters',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414L3.707 2.293zM5 7a1 1 0 100 2 1 1 0 000-2zM7 10a3 3 0 100 6 3 3 0 000-6zm10-7a3 3 0 100 6 3 3 0 000-6zm-1 9a3 3 0 100 6 3 3 0 000-6zM7.707 13.293a1 1 0 010 1.414L6.414 16H8a1 1 0 110 2H4a1 1 0 01-1-1v-4a1 1 0 112 0v1.586l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/portfolio',
        label: 'Portfolio',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
            </svg>
        ),
    },
    {
        href: '/organiser/analytics',
        label: 'Analytics',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
        ),
    },
    {
        href: '/organiser/payouts',
        label: 'Payouts',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/refunds',
        label: 'Refunds',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/settings',
        label: 'Settings',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/support',
        label: 'Help & Support',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/organiser/notifications',
        label: 'Notifications',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
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
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#C0C0C8] flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-widest text-lg">HEXLURA™</Link>
                <div className="flex items-center gap-2">
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
                    'fixed inset-y-0 z-50 flex flex-col bg-surface border-l border-border',
                    'transform transition-transform duration-300 ease-in-out',
                    'lg:left-0 lg:border-r lg:border-l-0 lg:translate-x-0',
                    'right-0',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
                style={{ width: '220px' }}
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

                {/* Logo */}
                <Link href="/" className="block px-6 py-5 border-b border-border hover:bg-card transition-colors">
                    <div className="font-heading text-xl text-accent tracking-widest">HEXLURA™</div>
                    <div className="text-xs text-muted mt-0.5">Organiser Portal</div>
                </Link>

                {/* Navigation — scrolls independently, pb-28 clears the mobile bottom nav */}
                <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [padding-bottom:max(7rem,env(safe-area-inset-bottom,7rem))]">
                    {visibleLinks.map((link) => {
                        const active = isActive(link.href, link.exact)
                        const loading = loadingPath === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative text-left ${
                                    active
                                        ? 'text-text bg-card font-medium'
                                        : loading
                                        ? 'text-muted'
                                        : 'text-muted hover:text-text hover:bg-card'
                                }`}
                            >
                                {active && (
                                    <span
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-accent"
                                        style={{ borderLeft: '2px solid #E63950' }}
                                    />
                                )}
                                <span className={active ? 'text-accent' : ''}>{link.icon}</span>
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
                    <div style={{ borderTop: '1px solid #C0C0C8', margin: '8px 0 0', paddingTop: '8px' }}>
                        <Link
                            href="/account"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-muted hover:text-text"
                            style={{ fontSize: '14px' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            My Account
                        </Link>
                    </div>

                    {/* User footer — inside scroll area so Sign Out is reachable */}
                    <div className="px-3 pt-4 pb-2 border-t border-border mt-2">
                        <div className="text-xs text-muted mb-0.5 truncate">{orgName}</div>
                        <div className="text-sm text-text font-medium truncate mb-2">{userName}</div>

                        {/* Identity verification status — clickable, links to settings */}
                        {(() => {
                            const target = '/organiser/settings#identity'
                            if (identityStatus === 'verified') {
                                return (
                                    <button
                                        onClick={() => handleNavClick(target)}
                                        className="w-full inline-flex items-center gap-1.5 mb-3 px-2 py-1 rounded-sm text-[11px] font-medium text-success bg-success/10 border border-success/30 hover:bg-success/15 transition-colors"
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
                                        className="w-full inline-flex items-center gap-1.5 mb-3 px-2 py-1 rounded-sm text-[11px] font-medium text-blue-500 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/15 transition-colors"
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
                                    className="w-full inline-flex items-center gap-1.5 mb-3 px-2 py-1 rounded-sm text-[11px] font-medium text-accent bg-accent/10 border border-accent/30 hover:bg-accent/15 transition-colors"
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
                </nav>
            </aside>
        </>
    )
}
