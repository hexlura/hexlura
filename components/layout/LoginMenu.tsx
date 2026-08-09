'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface LoginMenuProps {
    /** 'button' renders the full black "Login" button (desktop/tablet). 'icon' renders a compact user icon (mobile). */
    variant: 'button' | 'icon'
}

const organiserSVG = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
    <path d="M12 12l6 6" />
    <path d="M12 18l-3-3" />
</svg>

const userSVG = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
</svg>

const OPTIONS = [
    { label: 'User', href: '/auth/login', icon: userSVG },
    { label: 'Organiser', href: '/auth/login?next=/organiser', icon: organiserSVG },
]

export function LoginMenu({ variant }: LoginMenuProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
    const router = useRouter()

    useEffect(() => {
        if (!open) return

        function handlePointerDown(e: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('touchstart', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('touchstart', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    useEffect(() => {
        if (open) {
            const t = setTimeout(() => itemRefs.current[0]?.focus(), 10)
            return () => clearTimeout(t)
        }
    }, [open])

    const go = (href: string) => {
        setOpen(false)
        router.push(href)
    }

    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
        }
    }

    const handleItemKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            itemRefs.current[(index + 1) % OPTIONS.length]?.focus()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            itemRefs.current[(index - 1 + OPTIONS.length) % OPTIONS.length]?.focus()
        } else if (e.key === 'Tab' && !e.shiftKey && index === OPTIONS.length - 1) {
            setOpen(false)
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                onKeyDown={handleTriggerKeyDown}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Login"
                className={
                    variant === 'button'
                        ? 'flex items-center justify-center h-10 px-5 bg-[#0A0A0F] text-white text-[14px] font-medium tracking-wide transition-colors duration-200 hover:bg-[#E63950] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63950] focus-visible:ring-offset-2 active:bg-[#1A1A22]'
                        : 'flex items-center justify-center text-[#0A0A0F] p-1 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63950] focus-visible:ring-offset-2'
                }
            >
                {variant === 'button' ? (
                    'Login'
                ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                )}
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Login options"
                    className="absolute right-0 z-50 mt-2 min-w-[160px] bg-white border border-[#E0E0E0] shadow-lg py-1 transition-opacity duration-150"
                >
                    {OPTIONS.map((opt, i) => (
                        <a
                            key={opt.label}
                            ref={el => { itemRefs.current[i] = el }}
                            role="menuitem"
                            tabIndex={-1}
                            href={opt.href}
                            onClick={(e) => { e.preventDefault(); go(opt.href) }}
                            onKeyDown={(e) => handleItemKeyDown(e, i)}
                            className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-[#0A0A0F] hover:bg-[#F5F5F7] hover:text-[#E63950] focus:bg-[#F5F5F7] focus:text-[#E63950] transition-colors duration-150 cursor-pointer focus:outline-none"
                        >
                            {opt.icon}
                            {opt.label}
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}
