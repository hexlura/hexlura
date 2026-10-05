'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/notifications/NotificationsInbox'

interface PromoterSidebarProps {
    userName: string
    referralCode: string
    userId: string
}

const ico = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' } as const

const navLinks = [
    {
        href: '/promoter',
        label: 'Dashboard',
        exact: true,
        icon: <svg {...ico}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
    },
    {
        href: '/promoter/links',
        label: 'My Links',
        exact: false,
        icon: <svg {...ico}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>,
    },
    {
        href: '/promoter/events',
        label: 'Events',
        exact: false,
        icon: <svg {...ico}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>,
    },
    {
        href: '/promoter/payouts',
        label: 'Payouts',
        exact: false,
        icon: <svg {...ico}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg>,
    },
    {
        href: '/promoter/settings',
        label: 'Settings',
        exact: false,
        icon: <svg {...ico}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" /></svg>,
    },
    {
        href: '/promoter/support',
        label: 'Help & Support',
        exact: false,
        icon: <svg {...ico}><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.8-2.3 3.5" /><path d="M12 17h.01" /></svg>,
    },
    {
        href: '/promoter/notifications',
        label: 'Notifications',
        exact: false,
        icon: <svg {...ico}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
    },
]

export function PromoterSidebar({ userName, referralCode, userId }: PromoterSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [loadingPath, setLoadingPath] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
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
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        return () => {
            cancelled = true
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
        }
    }, [userId, pathname])

    useEffect(() => {
        setLoadingPath('')
        setIsOpen(false)
    }, [pathname])

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href)

    const handleNavClick = (href: string) => {
        setLoadingPath(href)
        setIsOpen(false)
    }

    const handleSignOut = async () => {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <>
            {/* Mobile header bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-wider text-xl">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></Link>
                <button onClick={() => setIsOpen(true)} className="text-text p-2 -mr-2" type="button" aria-label="Open menu">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" aria-hidden="true" />
            )}

            <aside
                className={[
                    'fixed inset-y-0 z-50 flex flex-col bg-white/80 backdrop-blur border-l border-border w-64',
                    'transform transition-transform duration-300 ease-in-out',
                    'lg:left-0 lg:border-r lg:border-l-0 lg:translate-x-0',
                    'right-0',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
            >
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

                <Link href="/" className="block shrink-0 px-7 pt-5 pb-4">
                    <div className="font-heading text-2xl text-accent tracking-wider">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-0.5">Promoter Portal</div>
                </Link>

                <nav className="flex-1 min-h-0 px-5 pb-4 flex flex-col gap-0.5 overflow-y-auto">
                    {navLinks.map((link) => {
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
                                        : 'text-muted hover:text-text hover:bg-background'
                                }`}
                            >
                                <span className="shrink-0">{link.icon}</span>
                                {link.label}
                                <span className="ml-auto flex items-center gap-1.5">
                                    {link.href === '/promoter/notifications' && unreadNotifications > 0 && (
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

                    {/* Name + sign out live in the desktop top bar; shown here on mobile only */}
                    <div className="lg:hidden pt-3 pb-2 mt-2 border-t border-border">
                        <div className="text-xs text-muted mb-0.5 truncate font-mono">{referralCode}</div>
                        <div className="text-sm text-text font-medium truncate mb-2">{userName}</div>
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {signingOut ? 'Signing out...' : 'Sign Out'}
                        </button>
                    </div>
                </nav>

                {/* Referral code card — pinned to the bottom, pb-20 on mobile clears the bottom nav */}
                <div className="shrink-0 p-5 pt-3 pb-20 lg:pb-5 border-t border-border">
                    <div className="bg-gradient-to-br from-accent via-accent to-warm-orange rounded-2xl p-5 text-white shadow-glow relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">Your referral code</p>
                        <p className="font-mono text-lg font-semibold mt-1.5 relative">{referralCode}</p>
                        <Link
                            href="/promoter/links"
                            onClick={() => setIsOpen(false)}
                            className="block text-center w-full bg-white text-text text-xs font-bold py-2.5 rounded-xl mt-4 hover:bg-white/90 transition-colors relative"
                        >
                            Get my links →
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    )
}
