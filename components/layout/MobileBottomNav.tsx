'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.75z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsLoggedIn(true)
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (data?.role) setRole(data.role)
    })
  }, [])

  if (!isMobile) return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Resolve href: protected tabs redirect to login if unauthenticated
  const resolveHref = (href: string, requiresAuth: boolean) => {
    if (requiresAuth && !isLoggedIn) {
      return `/auth/login?next=${encodeURIComponent(href)}`
    }
    return href
  }

  type NavItem = { label: string; href: string; icon: React.ReactNode; protected: boolean }

  const navItems: NavItem[] = [
    { label: 'Home',       href: '/',            icon: <HomeIcon />,   protected: false },
    { label: 'Explore',    href: '/events',      icon: <SearchIcon />, protected: false },
    { label: 'Tickets',    href: '/bookings',    icon: <TicketIcon />, protected: true  },
    { label: 'Favourites', href: '/favourites',  icon: <HeartIcon />,  protected: true  },
    { label: 'Profile',    href: '/account',     icon: <PersonIcon />, protected: true  },
  ]

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        minHeight: 64,
        maxHeight: 64,
        flexShrink: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E0E0E0',
        display: 'flex',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.href)
        const href = resolveHref(item.href, item.protected)
        return (
          <Link
            key={item.href}
            href={href}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              color: active ? '#E63950' : '#8888AA',
              transition: 'color 0.15s',
              textDecoration: 'none',
            }}
          >
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
