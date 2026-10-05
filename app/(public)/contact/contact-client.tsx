'use client'

import { ContactForm } from '@/components/contact/ContactForm'
import { useSearchParams } from 'next/navigation'

const CONTACT_INFO = [
    {
        label: 'Email',
        value: 'support@hexlura.com',
        href: 'mailto:support@hexlura.com',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
        ),
    },
    {
        label: 'Response time',
        value: 'We typically reply within a few hours during business days.',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        label: 'Based in',
        value: 'United Kingdom',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
    },
]

// Verified against components/layout/Footer.tsx — the app's canonical social list.
const SOCIAL_LINKS = [
    {
        label: 'Instagram',
        href: 'https://www.instagram.com/hexlura',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
    },
    {
        label: 'Facebook',
        href: 'https://www.facebook.com/share/17FUteK96w/?mibextid=wwXIfr',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
        ),
    },
    {
        label: 'TikTok',
        href: 'https://www.tiktok.com/@hexlura',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
            </svg>
        ),
    },
]

export default function ContactPageClient() {
    const searchParams = useSearchParams()
    const isSponsor = searchParams.get('sponsor') !== null

    return (
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
            {/* Hero */}
            <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="inline-block text-xs font-bold tracking-widest uppercase text-accent bg-warm-red/10 rounded-full px-3 py-1 mb-4">
                    {isSponsor ? 'For Sponsors' : 'Contact'}
                </span>
                <h1 className="font-heading text-5xl lg:text-6xl tracking-wide mb-3">GET IN TOUCH</h1>
                <p className="text-muted">
                    Planning an event or have a question about Hexlura? Tell us what you need and our team will get back to you.
                </p>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-12 items-start">
                {/* Left: contact info */}
                <div>
                    <div className="bg-card rounded-2xl border border-border shadow-soft divide-y divide-border">
                        {CONTACT_INFO.map(item => (
                            <div key={item.label} className="flex items-start gap-4 p-5">
                                <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-warm-red/10 text-accent">
                                    {item.icon}
                                </span>
                                <div className="space-y-0.5 min-w-0">
                                    <h3 className="text-sm font-semibold text-text">{item.label}</h3>
                                    {item.href ? (
                                        <a href={item.href} className="text-sm text-accent font-semibold hover:underline break-words">
                                            {item.value}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-muted leading-relaxed">{item.value}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8">
                        <h4 className="text-xs font-bold tracking-widest text-muted mb-4">FOLLOW US</h4>
                        <div className="flex items-center gap-3">
                            {SOCIAL_LINKS.map(social => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card text-muted hover:text-accent hover:border-accent transition-colors"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-muted leading-relaxed pt-8">
                        Hexlura Ltd &middot; 41 Junction Road, Northampton, England, NN2 7JA &middot; Company No. 17102803
                    </p>
                </div>

                {/* Right: form */}
                <ContactForm lockedTopic={isSponsor ? 'partnership' : undefined} />
            </div>
        </div>
    )
}
