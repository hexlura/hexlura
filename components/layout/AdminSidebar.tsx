'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdminSidebarProps {
    adminName: string
    pendingOrganisers: number
}

const NAV_SECTIONS = [
    {
        title: 'MAIN',
        links: [
            { href: '/admin', label: 'Dashboard', exact: true, badge: false },
            { href: '/admin/users', label: 'Users', exact: false, badge: false },
            { href: '/admin/organisers', label: 'Organisers', exact: false, badge: true },
            { href: '/admin/events', label: 'Events', exact: false, badge: false },
            { href: '/admin/bookings', label: 'Bookings', exact: false, badge: false },
        ],
    },
    {
        title: 'FINANCE',
        links: [
            { href: '/admin/financials', label: 'Financials', exact: false, badge: false },
            { href: '/admin/payouts', label: 'Payouts', exact: false, badge: false },
        ],
    },
    {
        title: 'PLATFORM',
        links: [
            { href: '/admin/settings', label: 'Settings', exact: false, badge: false },
            { href: '/admin/audit-log', label: 'Audit Log', exact: false, badge: false },
        ],
    },
]

export function AdminSidebar({ adminName, pendingOrganisers }: AdminSidebarProps) {
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
            className="fixed left-0 top-0 h-full flex flex-col z-50"
            style={{ width: '240px', background: '#0A0A0F', borderRight: '1px solid #2A2A3A' }}
        >
            <div className="px-6 py-5 border-b border-border">
                <div className="font-heading text-xl text-accent tracking-widest">HEXLURA</div>
                <div className="text-xs text-muted mt-0.5">Admin Console</div>
            </div>

            <nav className="flex-1 px-3 py-4 flex flex-col gap-5 overflow-y-auto">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <p className="text-[10px] text-muted font-medium tracking-widest px-3 mb-2">
                            {section.title}
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {section.links.map((link) => {
                                const active = isActive(link.href, link.exact)
                                const loading = loadingPath === link.href
                                return (
                                    <button
                                        key={link.href}
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
                                            {link.badge && pendingOrganisers > 0 && (
                                                <span className="text-[10px] font-bold bg-gold text-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                                    {pendingOrganisers}
                                                </span>
                                            )}
                                            {loading && (
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            )}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="text-sm text-text font-medium truncate mb-3">{adminName}</div>
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
