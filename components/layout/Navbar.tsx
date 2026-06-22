'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LeftMenu from './LeftMenu'
import { NotificationBell } from './NotificationBell'
import type { User } from '@supabase/supabase-js'

export function Navbar() {
    const router = useRouter()
    const pathname = usePathname()

    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState('user')
    const [fullName, setFullName] = useState<string | null>(null)
    const [isPromoter, setIsPromoter] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

    const mobileInputRef = useRef<HTMLInputElement>(null)

    // Close mobile search on route change
    useEffect(() => {
        setMobileSearchOpen(false)
    }, [pathname])

    // Auto-focus mobile input when expanded
    useEffect(() => {
        if (mobileSearchOpen) {
            setTimeout(() => mobileInputRef.current?.focus(), 30)
        }
    }, [mobileSearchOpen])

    // Fetch auth state
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadUser()
        })

        return () => subscription.unsubscribe()
    }, [])


    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const q = searchQuery.trim()
        if (q) {
            router.push(`/events?search=${encodeURIComponent(q)}`)
            setSearchQuery('')
            setMobileSearchOpen(false)
        }
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
            {/* ── DESKTOP layout (≥768px) ── */}
            <div className="hidden md:flex container mx-auto h-16 items-center justify-between px-4">
                {/* Left: logo */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-heading text-2xl text-accent tracking-wider">HEXLURA™</span>
                    </Link>
                </div>

                {/* Center: search bar */}
                <form onSubmit={handleSearch}>
                    <div
                        className="flex items-center transition-colors"
                        style={{
                            width: 380,
                            height: 40,
                            background: '#F5F5F7',
                            border: `1.5px solid ${searchFocused ? '#E63950' : '#E0E0E0'}`,
                            borderRadius: 0,
                        }}
                    >
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder="Search events, venues, cities..."
                            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#0A0A0F] placeholder-[#8888AA] px-3.5"
                        />
                        <button
                            type="submit"
                            className="flex items-center justify-center flex-shrink-0 h-full cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ width: 40, background: '#0A0A0F' }}
                            aria-label="Search"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </button>
                    </div>
                </form>

                {/* Right: notification bell + hamburger */}
                <div className="flex items-center gap-3">
                    {user && <NotificationBell userId={user.id} />}
                    <LeftMenu isLoggedIn={!!user} role={role} fullName={fullName} isPromoter={isPromoter} />
                </div>
            </div>

            {/* ── MOBILE layout (<768px) ── */}
            <div className="flex md:hidden container mx-auto h-16 items-center justify-between px-4">
                {mobileSearchOpen ? (
                    /* Expanded search bar — full width */
                    <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => { setMobileSearchOpen(false); setSearchQuery('') }}
                            className="flex-shrink-0 text-[#0A0A0F] p-1 hover:opacity-70 transition-opacity"
                            aria-label="Close search"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <line x1="4" y1="4" x2="16" y2="16" />
                                <line x1="16" y1="4" x2="4" y2="16" />
                            </svg>
                        </button>
                        <div
                            className="flex items-center flex-1"
                            style={{
                                height: 40,
                                background: '#F5F5F7',
                                border: '1.5px solid #E63950',
                                borderRadius: 0,
                            }}
                        >
                            <input
                                ref={mobileInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search events, venues, cities..."
                                className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#0A0A0F] placeholder-[#8888AA] px-3.5"
                            />
                            <button
                                type="submit"
                                className="flex items-center justify-center flex-shrink-0 h-full cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ width: 40, background: '#0A0A0F' }}
                                aria-label="Search"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Normal mobile navbar */
                    <>
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <span className="font-heading text-2xl text-accent tracking-wider">HEXLURA™</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            {user && <NotificationBell userId={user.id} />}
                            <button
                                onClick={() => setMobileSearchOpen(true)}
                                className="text-[#0A0A0F] p-1 hover:opacity-70 transition-opacity"
                                aria-label="Search"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </button>
                            <LeftMenu isLoggedIn={!!user} role={role} fullName={fullName} isPromoter={isPromoter} />
                        </div>
                    </>
                )}
            </div>
        </header>
    )
}
