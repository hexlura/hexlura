'use client'

import { ContactForm } from '@/components/contact/ContactForm'
import Image from 'next/image'
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
        <div className="relative bg-background overflow-hidden">
            {/* Soft ambient background lighting — brand accent, low opacity, static */}
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/[0.06] blur-3xl" />
                <div className="absolute top-96 -right-24 w-[24rem] h-[24rem] rounded-full bg-gold/[0.05] blur-3xl" />
            </div>

            <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
                {/* Hero */}
                <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
                    <div className="contact-hero-1 flex justify-center mb-5">
                        {/* Image with smooth continuous bounce animation */}
                        <div className="smooth-bounce will-change-transform">
                            <Image
                                src={isSponsor ? '/assets/images/Hexlura_desk.png' : '/assets/images/3D_Metal_Chat.png'}
                                width={isSponsor ? 500 : 200}
                                height={isSponsor ? 500 : 200}
                                alt={isSponsor ? 'Sponsor' : 'Chat'}
                            />
                        </div>
                    </div>
                    <div className="contact-hero-2 inline-block mb-5">
                        <span className="text-xs font-semibold tracking-widest uppercase text-accent border border-accent/30 bg-accent/5 rounded-full px-3 py-1">
                            {isSponsor ? 'For Sponsors' : 'Contact'}
                        </span>
                    </div>
                    <h1 className="contact-hero-3 font-heading text-5xl sm:text-6xl text-text mb-4">
                        Get in touch
                    </h1>
                    <p className="contact-hero-4 text-muted text-base sm:text-lg leading-relaxed">
                        Planning an event or have a question about Hexlura? Tell us what you need
                        and our team will get back to you.
                    </p>
                </div>

                {/* Two-column layout */}
                <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-14 items-start">
                    {/* Left: contact info */}
                    <div className="contact-info-stagger space-y-1">
                        {CONTACT_INFO.map((item, i) => (
                            <div
                                key={item.label}
                                className="contact-info-item group flex items-start gap-4 py-5 border-b border-border transition-transform hover:-translate-y-0.5"
                                style={{ animationDelay: `${300 + i * 90}ms` }}
                            >
                                <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-sm bg-surface border border-border text-accent transition-colors group-hover:bg-accent/10 group-hover:border-accent/30">
                                    {item.icon}
                                </span>
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-semibold text-text">{item.label}</h3>
                                    {item.href ? (
                                        <a href={item.href} className="text-sm text-accent hover:underline break-words">
                                            {item.value}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-muted leading-relaxed">{item.value}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="pt-8">
                            <h4 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
                                Follow us
                            </h4>
                            <div className="flex items-center gap-3">
                                {SOCIAL_LINKS.map(social => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className="flex items-center justify-center w-10 h-10 rounded-sm border border-border text-muted hover:text-accent hover:border-accent/30 hover:-translate-y-0.5 transition-all"
                                    >
                                        {social.icon}
                                    </a>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs text-muted leading-relaxed pt-10">
                            Hexlura Ltd &middot; 41 Junction Road, Northampton, England, NN2 7JA &middot; Company No. 17102803
                        </p>
                    </div>

                    {/* Right: form */}
                    <div className="contact-form-enter">
                        <ContactForm lockedTopic={isSponsor ? 'partnership' : undefined} />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes smooth-bounce {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                .smooth-bounce {
                    animation: smooth-bounce 3s ease-in-out infinite;
                }
                @keyframes contact-hero-fade {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes contact-item-fade {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .contact-hero-1 { animation: contact-hero-fade 0.5s ease-out both; }
                .contact-hero-2 { animation: contact-hero-fade 0.5s ease-out 0.08s both; }
                .contact-hero-3 { animation: contact-hero-fade 0.5s ease-out 0.16s both; }
                .contact-hero-4 { animation: contact-hero-fade 0.5s ease-out 0.24s both; }
                .contact-info-item {
                    animation: contact-item-fade 0.5s ease-out both;
                    animation-delay: 0.3s;
                }
                .contact-form-enter { animation: contact-hero-fade 0.6s ease-out 0.2s both; }
                @media (prefers-reduced-motion: reduce) {
                    .contact-hero-1, .contact-hero-2, .contact-hero-3, .contact-hero-4,
                    .contact-info-item, .contact-form-enter, .smooth-bounce {
                        animation: none;
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    )
}