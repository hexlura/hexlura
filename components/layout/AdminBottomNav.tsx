'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
    pendingOrganisers?: number
    onMoreClick: () => void
}

/* ── Icons ── */
function GridIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    )
}

function UsersIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21c0-4 3.134-7 7-7s7 3 7 7" />
            <path d="M19 8v6M22 11h-6" />
        </svg>
    )
}

function PayoutIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <circle cx="12" cy="15" r="1.5" />
        </svg>
    )
}

function BookingsIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2z" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="14" y2="14" />
        </svg>
    )
}

function MenuIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    )
}

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/admin', exact: true,  icon: <GridIcon /> },
    { label: 'Organisers', href: '/admin/organisers', exact: false, icon: <UsersIcon />, badge: true },
    { label: 'Payouts',    href: '/admin/payouts',    exact: false, icon: <PayoutIcon /> },
    { label: 'Bookings',   href: '/admin/bookings',   exact: false, icon: <BookingsIcon /> },
]

export function AdminBottomNav({ pendingOrganisers = 0, onMoreClick }: Props) {
    const pathname = usePathname()

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href)

    // Also highlight More when on a page not in the main 4
    const mainHrefs = NAV_ITEMS.map(i => i.href)
    const isMoreActive = !mainHrefs.some(h =>
        h === '/admin' ? pathname === '/admin' : pathname.startsWith(h)
    )

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
                background: '#FFFFFF',
                borderTop: '1px solid #E0E0E8',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <div style={{ display: 'flex', height: 60 }}>
                {NAV_ITEMS.map(item => {
                    const active = isActive(item.href, item.exact ?? false)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 3,
                                color: active ? '#E63950' : '#8888AA',
                                textDecoration: 'none',
                                transition: 'color 0.15s',
                                position: 'relative',
                            }}
                        >
                            {item.icon}
                            {'badge' in item && pendingOrganisers > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: '50%',
                                    transform: 'translateX(8px)',
                                    background: '#E8A000',
                                    color: '#000',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    minWidth: 16,
                                    height: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                }}>
                                    {pendingOrganisers > 9 ? '9+' : pendingOrganisers}
                                </span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}

                {/* More button */}
                <button
                    onClick={onMoreClick}
                    type="button"
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        color: isMoreActive ? '#E63950' : '#8888AA',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                    }}
                >
                    <MenuIcon />
                    <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>More</span>
                </button>
            </div>
        </nav>
    )
}
