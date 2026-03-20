import Link from 'next/link'

const discoverLinks = [
    { label: 'Find Events', href: '/events' },
    { label: 'Events Today', href: '/events?date=today' },
    { label: 'Events This Weekend', href: '/events?date=weekend' },
    { label: 'Search by City', href: '/events' },
    { label: 'All Categories', href: '/events' },
]

const organiserLinks = [
    { label: 'Sell Tickets', href: '/organiser' },
    { label: 'Organiser Login', href: '/auth/login' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Pricing & Fees', href: '/pricing' },
    { label: 'Help Centre', href: '/help' },
]

const companyLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Contact Us', href: '/contact' },
]

function FooterColumn({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h3
                className="text-white font-bold mb-4"
                style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '2px', fontSize: '1rem' }}
            >
                {heading}
            </h3>
            <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                    <li key={link.label}>
                        <Link
                            href={link.href}
                            className="text-sm text-muted hover:text-text transition-colors duration-200"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function Footer() {
    return (
        <footer style={{ background: '#0A0A0F', borderTop: '1px solid #2A2A3A' }}>
            <div className="max-w-7xl mx-auto px-6 py-16">
                {/* 4-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    {/* Column 1 — Brand */}
                    <div>
                        <div
                            className="font-heading text-2xl mb-3 tracking-widest"
                            style={{ color: '#E63950', fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                            HEXLURA
                        </div>
                        <p className="text-sm text-muted mb-4">
                            The UK&apos;s home for live events
                        </p>
                        <p className="text-sm text-muted">
                            © 2026 Hexlura Ltd
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#555570' }}>
                            Registered in England &amp; Wales
                        </p>
                    </div>

                    {/* Column 2 — Discover */}
                    <FooterColumn heading="Discover" links={discoverLinks} />

                    {/* Column 3 — For Organisers */}
                    <FooterColumn heading="For Organisers" links={organiserLinks} />

                    {/* Column 4 — Company */}
                    <FooterColumn heading="Company" links={companyLinks} />
                </div>

                {/* Bottom bar */}
                <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
                    style={{ borderTop: '1px solid #2A2A3A' }}
                >
                    {/* Social links */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted">Follow us:</span>
                        {/* Instagram */}
                        <a
                            href="#"
                            aria-label="Instagram"
                            className="text-muted hover:text-text transition-colors duration-200"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                        </a>
                        {/* Facebook */}
                        <a
                            href="#"
                            aria-label="Facebook"
                            className="text-muted hover:text-text transition-colors duration-200"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                            </svg>
                        </a>
                        {/* Twitter/X */}
                        <a
                            href="#"
                            aria-label="Twitter / X"
                            className="text-muted hover:text-text transition-colors duration-200"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>
                    </div>

                    {/* Stripe badge */}
                    <div className="flex items-center gap-2 text-muted">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-sm">Payments secured by Stripe</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
