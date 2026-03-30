'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/auth/actions'
import type { User } from '@supabase/supabase-js'

/* ─────────────────────────── SVG icons ─────────────────────────── */

function IconSearch({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    )
}

function IconX({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
        </svg>
    )
}

function IconHome({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
        </svg>
    )
}

function IconTicket({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
    )
}

function IconMap({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
        </svg>
    )
}

function IconTag({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
    )
}

function IconSell({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        </svg>
    )
}

function IconUser({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function IconSignOut({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    )
}

/* ─────────────────────────── Hamburger button ─────────────────────────── */

function HamburgerButton({ isOpen, onClick, size = 42 }: { isOpen: boolean; onClick: () => void; size?: number }) {
    return (
        <button
            onClick={onClick}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            style={{
                width: size,
                height: size,
                background: '#0A0A0F',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                cursor: 'pointer',
                border: 'none',
                flexShrink: 0,
                transition: 'background 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E63950' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0A0A0F' }}
        >
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    style={{
                        display: 'block',
                        width: 20,
                        height: 2,
                        background: '#FFFFFF',
                        borderRadius: 2,
                        transition: 'transform 0.3s ease, opacity 0.3s ease',
                        transform:
                            isOpen
                                ? i === 0 ? 'rotate(45deg) translateY(7px)'
                                : i === 2 ? 'rotate(-45deg) translateY(-7px)'
                                : 'none'
                                : 'none',
                        opacity: isOpen && i === 1 ? 0 : 1,
                        transformOrigin: 'center',
                    }}
                />
            ))}
        </button>
    )
}

/* ─────────────────────────── Main Navbar ─────────────────────────── */

export function Navbar() {
    const router = useRouter()
    const pathname = usePathname()

    // Auth state
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState('user')
    const [fullName, setFullName] = useState<string | null>(null)
    const [authLoaded, setAuthLoaded] = useState(false)

    // UI state
    const [menuOpen, setMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)

    const mobileInputRef = useRef<HTMLInputElement>(null)
    const desktopInputRef = useRef<HTMLInputElement>(null)

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false)
        setMobileSearchOpen(false)
    }, [pathname])

    // Prevent body scroll when menu open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [menuOpen])

    // Focus mobile input when search opens
    useEffect(() => {
        if (mobileSearchOpen) {
            setTimeout(() => mobileInputRef.current?.focus(), 50)
        }
    }, [mobileSearchOpen])

    // Fetch auth
    useEffect(() => {
        const supabase = createClient()

        async function loadUser() {
            const { data: { user: u } } = await supabase.auth.getUser()
            if (u) {
                setUser(u)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', u.id)
                    .single()
                setRole(profile?.role || 'user')
                setFullName(profile?.full_name || null)
            }
            setAuthLoaded(true)
        }

        loadUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setUser(null)
                setRole('user')
                setFullName(null)
            } else {
                loadUser()
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const initials = fullName
        ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.[0]?.toUpperCase() || '?'

    const sellTicketsHref = !user
        ? '/auth/register?next=/organiser/apply'
        : (role === 'organiser' || role === 'admin')
            ? '/organiser'
            : '/organiser/apply'

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        const q = searchQuery.trim()
        if (q) {
            router.push(`/events?search=${encodeURIComponent(q)}`)
            setSearchQuery('')
            setMobileSearchOpen(false)
            setMenuOpen(false)
        }
    }, [searchQuery, router])

    const navLinks = [
        { label: 'Home', href: '/', icon: <IconHome /> },
        { label: 'Find Events', href: '/events', icon: <IconSearch size={20} /> },
        { label: 'Sell Tickets', href: sellTicketsHref, icon: <IconSell /> },
        { label: 'Browse by City', href: '/events?view=cities', icon: <IconMap /> },
        { label: 'All Categories', href: '/events?view=categories', icon: <IconTag /> },
    ]

    const secondaryLinks = [
        { label: 'About', href: '/about' },
        { label: 'Help', href: '/help' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
    ]

    return (
        <>
            {/* ── NAVBAR BAR ── */}
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    background: '#FFFFFF',
                    borderBottom: '1px solid #F0F0F0',
                    boxShadow: '0 1px 20px rgba(0,0,0,0.06)',
                }}
            >
                {/* ── DESKTOP (≥768px) ── */}
                <div
                    className="hidden md:flex"
                    style={{
                        height: 64,
                        padding: '0 40px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Left — Logo */}
                    <div style={{ flex: 1 }}>
                        <Link
                            href="/"
                            style={{
                                fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                                fontSize: 28,
                                color: '#E63950',
                                letterSpacing: 4,
                                textDecoration: 'none',
                                display: 'inline-block',
                                lineHeight: 1,
                            }}
                        >
                            HEXLURA
                        </Link>
                    </div>

                    {/* Center — Search */}
                    <form onSubmit={handleSearch}>
                        <div
                            style={{
                                width: 420,
                                height: 42,
                                background: searchFocused ? '#FFFFFF' : '#F5F5F7',
                                border: `1.5px solid ${searchFocused ? '#E63950' : 'transparent'}`,
                                borderRadius: 0,
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 16px',
                                gap: 10,
                                transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                                boxShadow: searchFocused ? '0 0 0 3px rgba(230,57,80,0.08)' : 'none',
                            }}
                        >
                            <IconSearch size={18} color="#8888AA" />
                            <input
                                ref={desktopInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder="Search events, venues, cities..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 14,
                                    color: '#0A0A0F',
                                }}
                                className="placeholder-[#8888AA]"
                            />
                        </div>
                    </form>

                    {/* Right — Hamburger */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen(o => !o)} size={42} />
                    </div>
                </div>

                {/* ── MOBILE (<768px) ── */}
                <div
                    className="flex md:hidden"
                    style={{
                        height: 56,
                        padding: '0 16px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                    }}
                >
                    {/* Logo — collapses when search open */}
                    <div
                        style={{
                            overflow: 'hidden',
                            transition: 'opacity 0.25s ease, max-width 0.25s ease',
                            opacity: mobileSearchOpen ? 0 : 1,
                            maxWidth: mobileSearchOpen ? 0 : 160,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Link
                            href="/"
                            tabIndex={mobileSearchOpen ? -1 : 0}
                            style={{
                                fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                                fontSize: 22,
                                color: '#E63950',
                                letterSpacing: 3,
                                textDecoration: 'none',
                                display: 'inline-block',
                                lineHeight: 1,
                            }}
                        >
                            HEXLURA
                        </Link>
                    </div>

                    {/* Mobile search — icon or expanded bar */}
                    <div
                        style={{
                            flex: mobileSearchOpen ? 1 : 0,
                            transition: 'flex 0.25s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {mobileSearchOpen ? (
                            <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <button
                                    type="button"
                                    onClick={() => { setMobileSearchOpen(false); setSearchQuery('') }}
                                    style={{ padding: 8, cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0, color: '#0A0A0F' }}
                                    aria-label="Close search"
                                >
                                    <IconX size={20} color="#0A0A0F" />
                                </button>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 40,
                                        background: '#F5F5F7',
                                        border: '1.5px solid #E63950',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 12px',
                                        gap: 8,
                                    }}
                                >
                                    <input
                                        ref={mobileInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search events..."
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: 15,
                                            color: '#0A0A0F',
                                        }}
                                        className="placeholder-[#8888AA]"
                                    />
                                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8888AA' }}>
                                        <IconSearch size={18} color="#8888AA" />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setMobileSearchOpen(true)}
                                aria-label="Search"
                                style={{
                                    width: 40,
                                    height: 40,
                                    background: '#F5F5F7',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'background 0.2s',
                                    color: '#0A0A0F',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E63950'; (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F7'; (e.currentTarget as HTMLButtonElement).style.color = '#0A0A0F' }}
                            >
                                <IconSearch size={20} color="currentColor" />
                            </button>
                        )}
                    </div>

                    {/* Hamburger */}
                    {!mobileSearchOpen && (
                        <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen(o => !o)} size={40} />
                    )}
                </div>
            </header>

            {/* ── BACKDROP ── */}
            <div
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 48,
                    opacity: menuOpen ? 1 : 0,
                    pointerEvents: menuOpen ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease',
                }}
            />

            {/* ── MENU PANEL ── */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: 'min(320px, 100vw)',
                    height: '100vh',
                    background: '#FFFFFF',
                    zIndex: 49,
                    transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {/* Panel header */}
                <div
                    style={{
                        height: 64,
                        padding: '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #F0F0F0',
                        flexShrink: 0,
                    }}
                >
                    <span
                        style={{
                            fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                            fontSize: 22,
                            color: '#E63950',
                            letterSpacing: 3,
                            lineHeight: 1,
                        }}
                    >
                        HEXLURA
                    </span>
                    <button
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#F5F5F7',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s, color 0.2s',
                            color: '#0A0A0F',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E63950'; (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F7'; (e.currentTarget as HTMLButtonElement).style.color = '#0A0A0F' }}
                    >
                        <IconX size={18} color="currentColor" />
                    </button>
                </div>

                {/* Auth section */}
                <div
                    style={{
                        padding: '20px 24px',
                        background: '#F5F5F7',
                        borderBottom: '1px solid #F0F0F0',
                        flexShrink: 0,
                    }}
                >
                    {!authLoaded ? null : !user ? (
                        <>
                            <Link
                                href="/auth/login"
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: 46,
                                    background: '#0A0A0F',
                                    color: '#FFFFFF',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    marginBottom: 10,
                                    transition: 'background 0.2s',
                                    border: 'none',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#E63950' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#0A0A0F' }}
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: 46,
                                    background: 'transparent',
                                    color: '#0A0A0F',
                                    border: '2px solid #0A0A0F',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    transition: 'background 0.2s, color 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#0A0A0F'; (e.currentTarget as HTMLAnchorElement).style.color = '#FFFFFF' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#0A0A0F' }}
                            >
                                Get Started
                            </Link>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'rgba(230,57,80,0.12)',
                                    color: '#E63950',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    fontFamily: '"Bebas Neue", sans-serif',
                                    letterSpacing: 1,
                                }}
                            >
                                {initials}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0F', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fullName || 'My Account'}
                                </p>
                                <p style={{ fontSize: 12, color: '#8888AA', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* My Account / Dashboard quick links for logged-in */}
                {authLoaded && user && (
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
                        <MenuLink href="/account" onClick={() => setMenuOpen(false)} icon={<IconUser size={20} />}>
                            My Account
                        </MenuLink>
                        {(role === 'organiser' || role === 'admin') && (
                            <MenuLink href="/organiser" onClick={() => setMenuOpen(false)} icon={<IconTicket size={20} />}>
                                Organiser Dashboard
                            </MenuLink>
                        )}
                        {role === 'admin' && (
                            <MenuLink href="/admin" onClick={() => setMenuOpen(false)} icon={<IconSell size={20} />}>
                                Admin Panel
                            </MenuLink>
                        )}
                    </div>
                )}

                {/* Main nav links */}
                <div style={{ padding: '8px 0', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
                    {navLinks.map(link => (
                        <MenuLink key={link.href} href={link.href} onClick={() => setMenuOpen(false)} icon={link.icon}>
                            {link.label}
                        </MenuLink>
                    ))}
                </div>

                {/* Secondary links */}
                <div style={{ padding: '8px 0', marginTop: 'auto', flexShrink: 0 }}>
                    {secondaryLinks.map(link => (
                        <SecondaryLink key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                            {link.label}
                        </SecondaryLink>
                    ))}

                    {authLoaded && user && (
                        <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 4 }}>
                            <form action={signOut}>
                                <button
                                    type="submit"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        width: '100%',
                                        padding: '12px 24px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: '#E63950',
                                        textAlign: 'left',
                                    }}
                                >
                                    <IconSignOut size={16} />
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

/* ─────────────────────────── Menu link sub-components ─────────────────────────── */

function MenuLink({
    href,
    onClick,
    icon,
    children,
}: {
    href: string
    onClick: () => void
    icon: React.ReactNode
    children: React.ReactNode
}) {
    const [hovered, setHovered] = useState(false)

    return (
        <Link
            href={href}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                height: 52,
                padding: '0 24px',
                fontSize: 15,
                fontWeight: 600,
                color: hovered ? '#E63950' : '#0A0A0F',
                textDecoration: 'none',
                borderLeft: `3px solid ${hovered ? '#E63950' : 'transparent'}`,
                background: hovered ? '#F5F5F7' : 'transparent',
                transition: 'all 0.15s',
                boxSizing: 'border-box',
            }}
        >
            <span style={{ color: hovered ? '#E63950' : '#8888AA', flexShrink: 0, display: 'flex' }}>
                {icon}
            </span>
            {children}
        </Link>
    )
}

function SecondaryLink({
    href,
    onClick,
    children,
}: {
    href: string
    onClick: () => void
    children: React.ReactNode
}) {
    const [hovered, setHovered] = useState(false)

    return (
        <Link
            href={href}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                height: 44,
                padding: '0 24px',
                fontSize: 13,
                color: hovered ? '#0A0A0F' : '#8888AA',
                textDecoration: 'none',
                transition: 'color 0.15s',
            }}
        >
            {children}
        </Link>
    )
}
