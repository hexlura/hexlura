'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { CATEGORIES } from '@/lib/config/categories'

interface LeftMenuProps {
    isLoggedIn: boolean
    role: string
    fullName: string | null
}

export default function LeftMenu({ isLoggedIn, role }: LeftMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [open, setOpen] = useState<Record<string, boolean>>({})
    const pathname = usePathname()

    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    const close = () => setIsOpen(false)
    const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

    const sellTicketsHref = !isLoggedIn
        ? '/auth/register?next=/organiser/apply'
        : (role === 'organiser' || role === 'admin')
            ? '/organiser'
            : '/organiser/apply'

    const isActive = (href: string) => pathname === href

    const linkClass = (href: string) =>
        `block text-[15px] py-2.5 transition-colors ${isActive(href) ? 'text-[#E63950]' : 'text-[#0A0A0F] hover:text-[#E63950]'}`

    const heading = (label: string, key: string) => (
        <>
            <button
                onClick={() => toggle(key)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '14px 0 6px 0',
                    marginTop: '8px',
                }}
            >
                <p
                    style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        color: '#666677',
                        letterSpacing: '2px',
                        margin: 0,
                    }}
                >
                    {label}
                </p>
                <span style={{ fontSize: 20, color: '#666677', lineHeight: 1, fontWeight: 300 }}>
                    {open[key] ? '−' : '+'}
                </span>
            </button>
            <div className="border-t border-[#C0C0C8]" />
        </>
    )

    return (
        <>
            {/* Hamburger button */}
            <button
                onClick={() => setIsOpen(true)}
                className="text-[#0A0A0F] p-1 mr-3 hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label="Open menu"
            >
                <svg width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden="true">
                    <rect y="0"  width="22" height="2" rx="1" fill="currentColor" />
                    <rect y="9"  width="22" height="2" rx="1" fill="currentColor" />
                    <rect y="18" width="22" height="2" rx="1" fill="currentColor" />
                </svg>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40"
                    onClick={close}
                    aria-hidden="true"
                />
            )}

            {/* Slide panel */}
            <div
                className={`fixed top-0 right-0 z-50 h-screen bg-[#FFFFFF] border-l border-[#C0C0C8] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: 'min(300px, 85vw)' }}
            >
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-[#E8E8EE]">
                    <div>
                        <p className="font-heading text-2xl text-[#E63950] tracking-wider">HEXLURA</p>
                        <p className="text-xs text-[#666677] mt-0.5">UK Event Tickets</p>
                    </div>
                    <button
                        onClick={close}
                        className="text-[#666677] hover:text-[#0A0A0F] transition-colors"
                        aria-label="Close menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M2 2L18 18M18 2L2 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 [padding-bottom:max(7rem,env(safe-area-inset-bottom,7rem))]">

                    {/* MY ACCOUNT — top, logged in */}
                    {isLoggedIn && (
                        <>
                            {heading('MY ACCOUNT', 'account')}
                            {open['account'] && (
                                <div className="pt-2 space-y-0.5">
                                    <Link href="/account/settings" onClick={close} className={linkClass('/account/settings')}>Account Settings</Link>
                                    {role === 'organiser' && (
                                        <Link href="/organiser" onClick={close} className={linkClass('/organiser')}>Organiser Portal</Link>
                                    )}
                                    {role === 'admin' && (
                                        <Link href="/admin" onClick={close} className={linkClass('/admin')}>Admin Panel</Link>
                                    )}
                                    <div className="pt-2">
                                        <form action={signOut}>
                                            <button
                                                type="submit"
                                                className="text-[15px] text-[#E63950] hover:opacity-80 transition-opacity"
                                            >
                                                Sign Out
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ACCOUNT — logged out */}
                    {!isLoggedIn && (
                        <>
                            {heading('ACCOUNT', 'account')}
                            {open['account'] && (
                                <div className="pt-2 space-y-0.5">
                                    <Link href="/auth/login" onClick={close} className={linkClass('/auth/login')}>Log In</Link>
                                    <Link href="/auth/register" onClick={close} className={linkClass('/auth/register')}>Get Started</Link>
                                </div>
                            )}
                        </>
                    )}

                    {/* FIND EVENTS */}
                    {heading('FIND EVENTS', 'find')}
                    {open['find'] && (
                        <div className="pt-2 space-y-0.5">
                            <Link href="/events" onClick={close} className={linkClass('/events')}>All Events</Link>
                            <Link href="/events?date=today" onClick={close} className={linkClass('/events?date=today')}>Events Today</Link>
                            <Link href="/events?date=weekend" onClick={close} className={linkClass('/events?date=weekend')}>This Weekend</Link>
                            <Link href="/events" onClick={close} className="block text-[15px] py-2.5 text-[#0A0A0F] hover:text-[#E63950] transition-colors">Near Me</Link>
                        </div>
                    )}

                    {/* CATEGORIES */}
                    {heading('CATEGORIES', 'categories')}
                    {open['categories'] && (
                        <div className="pt-2 space-y-0.5">
                            {CATEGORIES.map(cat => (
                                <Link key={cat} href={`/events?category=${cat}`} onClick={close} className={linkClass(`/events?category=${cat}`)}>
                                    {cat}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* FOR BUSINESS */}
                    {heading('FOR BUSINESS', 'business')}
                    {open['business'] && (
                        <div className="pt-2 space-y-0.5">
                            <Link href={sellTicketsHref} onClick={close} className={linkClass(sellTicketsHref)}>Sell Tickets</Link>
                            <Link href="/how-it-works" onClick={close} className={linkClass('/how-it-works')}>How It Works</Link>
                            <Link href="/pricing" onClick={close} className={linkClass('/pricing')}>Pricing &amp; Fees</Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
