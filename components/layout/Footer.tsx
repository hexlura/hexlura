import Link from 'next/link'

const discoverLinks = [
    { label: 'Browse Events', href: '/events' },
    { label: 'Events Today', href: '/events?date=today' },
    { label: 'Events This Weekend', href: '/events?date=weekend' },
    { label: 'How It Works', href: '/how-it-works' },
]

const organiserLinks = [
    { label: 'Sell Tickets', href: '/business' },
    { label: 'Organiser Login', href: '/auth/login?next=/organiser' },
    { label: 'Become a Promoter', href: '/promoter/apply' },
]

const companyLinks = [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Cookies', href: '/cookies' },
]

const socialClass = 'w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors'

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <p className="text-xs font-bold text-muted tracking-widest mb-3">{title}</p>
            <div className="flex flex-col gap-2 text-sm">
                {links.map(l => (
                    <Link key={l.href} href={l.href} className="hover:text-accent transition-colors">{l.label}</Link>
                ))}
            </div>
        </div>
    )
}

export function Footer() {
    return (
        <footer className="border-t border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2">
                    <p className="font-heading text-2xl text-accent tracking-wider mb-3">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></p>
                    <p className="text-sm text-muted max-w-xs">The UK&apos;s home for live events — discover, book and sell tickets in one place.</p>
                    <div className="flex gap-2 mt-5">
                        <a href="https://www.instagram.com/hexlura" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={socialClass}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                        </a>
                        <a href="https://www.facebook.com/share/17FUteK96w/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={socialClass}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                        </a>
                        <a href="https://www.tiktok.com/@hexlura" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={socialClass}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" /></svg>
                        </a>
                    </div>
                </div>
                <Column title="DISCOVER" links={discoverLinks} />
                <Column title="ORGANISERS" links={organiserLinks} />
                <Column title="COMPANY" links={companyLinks} />
            </div>
            <div className="border-t border-border">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
                    <p>© 2026 Hexlura Ltd. Company No. 17102803. Registered in England &amp; Wales. All rights reserved.</p>
                    <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warm-green"><path d="M12 2 3 6v6c0 5 3.8 9 9 10 5.2-1 9-5 9-10V6z" /></svg>
                        Secure payments via Stripe
                    </div>
                </div>
            </div>
        </footer>
    )
}
