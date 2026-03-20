'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrganiserSidebarProps {
    userName: string
    orgName: string
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
        href: '/organiser/settings',
        label: 'Settings',
        exact: false,
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
        ),
    },
]

export function OrganiserSidebar({ userName, orgName }: OrganiserSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [loadingPath, setLoadingPath] = useState('')

    useEffect(() => {
        setLoadingPath('')
    }, [pathname])

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href
        return pathname.startsWith(href)
    }

    const handleNavClick = (href: string) => {
        setLoadingPath(href)
        router.push(href)
    }

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <aside
            className="fixed left-0 top-0 h-full flex flex-col z-50 bg-surface border-r border-border"
            style={{ width: '220px' }}
        >
            {/* Logo */}
            <div className="px-6 py-5 border-b border-border">
                <div className="font-heading text-xl text-accent tracking-widest">HEXLURA</div>
                <div className="text-xs text-muted mt-0.5">Organiser Portal</div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
                {navLinks.map((link) => {
                    const active = isActive(link.href, link.exact)
                    const loading = loadingPath === link.href
                    return (
                        <button
                            key={link.href}
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
                            {loading && (
                                <svg className="animate-spin h-3 w-3 ml-auto shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* User footer */}
            <div className="p-4 border-t border-border">
                <div className="text-xs text-muted mb-0.5 truncate">{orgName}</div>
                <div className="text-sm text-text font-medium truncate mb-3">{userName}</div>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
