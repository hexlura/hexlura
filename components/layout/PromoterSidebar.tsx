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

const navLinks = [
    {
        href: '/promoter',
        label: 'Dashboard',
        exact: true,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2 11l8-8 8 8v9H13v-6H7v6H2V11z" />
            </svg>
        ),
    },
    {
        href: '/promoter/links',
        label: 'My Links',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/promoter/events',
        label: 'Events',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" />
            </svg>
        ),
    },
    {
        href: '/promoter/payouts',
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
        href: '/promoter/settings',
        label: 'Settings',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/promoter/support',
        label: 'Help & Support',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: '/promoter/notifications',
        label: 'Notifications',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
        ),
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
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#C0C0C8] flex items-center justify-between px-4">
                <Link href="/" className="font-heading text-accent tracking-widest text-lg">HEXLURA</Link>
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

            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    aria-hidden="true"
                />
            )}

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

                <Link href="/" className="block px-6 py-5 border-b border-border hover:bg-card transition-colors">
                    <div className="font-heading text-xl text-accent tracking-widest">HEXLURA</div>
                    <div className="text-xs text-muted mt-0.5">Promoter Portal</div>
                </Link>

                <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [padding-bottom:max(7rem,env(safe-area-inset-bottom,7rem))]">
                    {navLinks.map((link) => {
                        const active = isActive(link.href, link.exact)
                        const loading = loadingPath === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative text-left ${
                                    active ? 'text-text bg-card font-medium' : 'text-muted hover:text-text hover:bg-card'
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

                    <div style={{ borderTop: '1px solid #C0C0C8', margin: '8px 0 0', paddingTop: '8px' }}>
                        <Link
                            href="/account"
                            onClick={() => handleNavClick('/account')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                            style={{ fontSize: '14px', color: '#666677' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            My Account
                        </Link>
                    </div>

                    <div className="px-3 pt-4 pb-2 border-t border-border mt-2">
                        <div className="text-xs text-muted mb-0.5 truncate font-mono">{referralCode}</div>
                        <div className="text-sm text-text font-medium truncate mb-3">{userName}</div>
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
