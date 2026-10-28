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

export default function ContactPageClient({ whatsapp }: { whatsapp: { display: string; href: string } | null }) {
    const searchParams = useSearchParams()
    const isSponsor = searchParams.get('sponsor') !== null

    // WhatsApp sits right under Email when the company has set a number.
    const contactRows = whatsapp
        ? [
            CONTACT_INFO[0],
            {
                label: 'WhatsApp',
                value: `${whatsapp.display} — chat with us`,
                href: whatsapp.href,
                external: true,
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                ),
            },
            ...CONTACT_INFO.slice(1),
        ]
        : CONTACT_INFO

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
                        {contactRows.map(item => (
                            <div key={item.label} className="flex items-start gap-4 p-5">
                                <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-warm-red/10 text-accent">
                                    {item.icon}
                                </span>
                                <div className="space-y-0.5 min-w-0">
                                    <h3 className="text-sm font-semibold text-text">{item.label}</h3>
                                    {item.href ? (
                                        <a
                                            href={item.href}
                                            {...('external' in item && item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                            className="text-sm text-accent font-semibold hover:underline break-words">
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
                        Hexlura Ltd &middot; 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ &middot; Company No. 17102803
                    </p>
                </div>

                {/* Right: form */}
                <ContactForm lockedTopic={isSponsor ? 'partnership' : undefined} />
            </div>
        </div>
    )
}
