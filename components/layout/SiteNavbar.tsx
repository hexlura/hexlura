'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SignOutButton } from './SignOutButton'

const NAV_LINKS = [
    { href: '/events', label: 'Browse Events' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/business', label: 'For Organisers' },
    { href: '/about', label: 'About' },
]

// Site-wide top navigation. On the homepage it floats transparently over the dark hero
// (white text); everywhere else it is a light sticky bar.
export function SiteNavbar() {
    const pathname = usePathname()
    const overlay = pathname === '/'

    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState('user')
    const [fullName, setFullName] = useState<string | null>(null)
    const [isPromoter, setIsPromoter] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [accountOpen, setAccountOpen] = useState(false)
    const accountRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMenuOpen(false)
        setAccountOpen(false)
    }, [pathname])

    // Close the account dropdown on an outside click or Escape.
    useEffect(() => {
        if (!accountOpen) return
        function onPointerDown(e: MouseEvent) {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setAccountOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [accountOpen])

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

                const { data: promoter } = await supabase
                    .from('promoter_profiles')
                    .select('id')
                    .eq('user_id', u.id)
                    .maybeSingle()
                setIsPromoter(!!promoter)
            } else {
                setUser(null)
                setRole('user')
                setFullName(null)
                setIsPromoter(false)
            }
        }

        loadUser()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadUser() })
        return () => subscription.unsubscribe()
    }, [])

    // Every workspace this person can open. Someone can hold more than one (e.g. an organiser who is also a
    // promoter — being a promoter is a separate record, not the role), so list them all rather than only the first.
    const workspaces: { href: string; label: string; menuLabel: string }[] = []
    if (role === 'admin') workspaces.push({ href: '/admin', label: 'Admin', menuLabel: 'Admin dashboard' })
    if (role === 'organiser') workspaces.push({ href: '/organiser', label: 'Dashboard', menuLabel: 'Organiser dashboard' })
    if (isPromoter) workspaces.push({ href: '/promoter', label: 'Promoter', menuLabel: 'Promoter dashboard' })
    if (role === 'door_staff') workspaces.push({ href: '/checkin', label: 'Scanner', menuLabel: 'Scanner' })
    // The button in the top bar stays the primary one; the account menu and mobile menu list all of them.
    const dashboard = workspaces[0] ?? null

    const initial = (fullName || user?.email || 'A').charAt(0).toUpperCase()

    const linkClass = overlay
        ? 'px-3 py-2 rounded-lg text-white/70 hover:text-white transition-colors'
        : 'px-3 py-2 rounded-lg text-muted hover:bg-background hover:text-text transition-colors'
    const iconClass = overlay
        ? 'p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors'
        : 'p-2 rounded-full text-muted hover:bg-background hover:text-accent transition-colors'

    return (
        <header className={overlay
            ? 'absolute top-0 inset-x-0 z-40'
            : 'sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border'}
        >
            <div className={`max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between gap-6 ${overlay ? 'h-20' : 'h-16'}`}>
                <Link href="/" className={`font-heading text-2xl tracking-wider shrink-0 ${overlay ? 'text-white' : 'text-accent'}`}>
                    HEXLURA<sup className={`text-[0.45em] align-super tracking-normal ${overlay ? 'text-accent' : ''}`}>®</sup>
                </Link>

                <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5 shrink-0">
                    {user ? (
                        <>
                            {dashboard && (
                                <Link
                                    href={dashboard.href}
                                    className={`hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-semibold transition ${overlay ? 'bg-white/10 text-white hover:bg-white/20' : 'border border-border text-text hover:bg-background'}`}
                                >
                                    {dashboard.label}
                                </Link>
                            )}
                            <Link href="/favourites" className={`hidden sm:block ${iconClass}`} aria-label="Favourites" title="Favourites">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                            </Link>
                            <Link href="/notifications" className={`hidden sm:block ${iconClass}`} aria-label="Notifications" title="Notifications">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                            </Link>
                            <div className="relative ml-1" ref={accountRef}>
                                <button
                                    type="button"
                                    onClick={() => setAccountOpen(o => !o)}
                                    aria-label="Account menu"
                                    aria-haspopup="menu"
                                    aria-expanded={accountOpen}
                                    className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-warm-orange flex items-center justify-center text-white text-sm font-bold"
                                >
                                    {initial}
                                </button>
                                {accountOpen && (
                                    <div role="menu" className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-hover p-1.5 text-sm font-semibold text-text z-50">
                                        <p className="px-3 py-2 text-xs font-normal text-muted truncate border-b border-border mb-1">{user.email}</p>
                                        <Link role="menuitem" href="/account" className="block px-3 py-2.5 rounded-xl hover:bg-background">My Account</Link>
                                        <Link role="menuitem" href="/bookings" className="block px-3 py-2.5 rounded-xl hover:bg-background">My Bookings</Link>
                                        {workspaces.map(w => (
                                            <Link key={w.href} role="menuitem" href={w.href} className="block px-3 py-2.5 rounded-xl hover:bg-background">{w.menuLabel}</Link>
                                        ))}
                                        <div className="border-t border-border my-1" />
                                        <SignOutButton menuItem className="w-full text-left px-3 py-2.5 rounded-xl text-accent hover:bg-background" />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className={`hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-semibold transition-colors ${overlay ? 'text-white/90 hover:text-white' : 'text-text hover:bg-background'}`}
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white shadow-glow hover:brightness-110 transition"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                        className={`lg:hidden ml-1 ${iconClass}`}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="lg:hidden px-4 pb-4">
                    <div className="bg-card rounded-2xl border border-border shadow-hover p-2 flex flex-col text-sm font-semibold">
                        {NAV_LINKS.map(l => (
                            <Link key={l.href} href={l.href} className="px-4 py-3 rounded-xl text-text hover:bg-background">{l.label}</Link>
                        ))}
                        <div className="border-t border-border my-1" />
                        {user ? (
                            <>
                                {workspaces.map(w => (
                                    <Link key={w.href} href={w.href} className="px-4 py-3 rounded-xl text-text hover:bg-background">{w.menuLabel}</Link>
                                ))}
                                <Link href="/account" className="px-4 py-3 rounded-xl text-text hover:bg-background">My Account</Link>
                                <Link href="/favourites" className="px-4 py-3 rounded-xl text-text hover:bg-background">Favourites</Link>
                                <div className="border-t border-border my-1" />
                                <SignOutButton className="w-full text-left px-4 py-3 rounded-xl text-accent hover:bg-background" />
                            </>
                        ) : (
                            <Link href="/auth/login" className="px-4 py-3 rounded-xl text-text hover:bg-background">Log In</Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
