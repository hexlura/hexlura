'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const sectionLinks = [
    { label: 'Why Hexlura', href: '#why-hexlura' },
    { label: 'The numbers', href: '#calculator' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'FAQ', href: '#faqs' },
    { label: 'Sponsor', href: '/contact?sponsor=true' },
    { label: 'Contact', href: '/contact' }
]

export default function SellingNavbar({ ctaHref }: { ctaHref: string }) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const hero = document.getElementById('hero-section')

        const onScroll = () => {
            const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 24
            setScrolled(window.scrollY > heroBottom - 80)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        const el = document.querySelector(href)
        if (!el) return
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setMobileOpen(false)
    }

    return (
        <div className="fixed w-full z-50 top-0 px-4 sm:px-6 pt-4">
            <nav
                className={`max-w-6xl mx-auto flex justify-between items-center rounded-full transition-all duration-500 ${scrolled
                    ? 'backdrop-blur-lg bg-transparent border border-black/5 px-4 py-2 sm:px-5 sm:py-3'
                    : 'border-none px-5 py-3'
                    }`}
                style={{
                    boxShadow: scrolled ? '0 8px 30px -12px rgba(234,40,69,0.2)' : '',
                    transform: scrolled ? 'scale(0.98)' : 'scale(1)',
                }}
            >
                <Link href="/" className="flex items-center space-x-2">
                    <span className={`font-black text-hexred tracking-tighter transition-all duration-500 ${scrolled ? 'text-base sm:text-lg' : 'text-xl'}`}>HEXLURA®</span>
                </Link>

                <div className="hidden md:flex items-center gap-8 mx-8">
                    {sectionLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleSectionClick(e, link.href)}
                            className={`text-sm font-medium hover:text-hexred transition-colors whitespace-nowrap ${scrolled ? "text-gray-900" : "text-white"}`}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={ctaHref}
                        className="hidden sm:inline-block bg-hexred text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_6px_20px_-6px_rgba(234,40,69,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
                    >
                        Start selling
                    </Link>
                    <button
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen}
                        className="md:hidden text-hexdark w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </nav>

            {mobileOpen && (
                <div className="max-w-6xl mx-auto mt-2 md:hidden bg-white/95 backdrop-blur-xl border border-black/5 rounded-3xl shadow-xl p-4 space-y-1">
                    {sectionLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleSectionClick(e, link.href)}
                            className="block text-center text-sm font-medium text-gray-600 hover:text-hexred transition-colors px-5 py-3 rounded-full hover:bg-gray-50"
                        >
                            {link.label}
                        </a>
                    ))}
                    <Link
                        href={ctaHref}
                        onClick={() => setMobileOpen(false)}
                        className="block text-center bg-hexred text-white text-sm font-bold px-5 py-3 rounded-full mt-2"
                    >
                        Start selling
                    </Link>
                </div>
            )}
        </div>
    )
}
