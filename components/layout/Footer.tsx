import Link from 'next/link'

const discoverLinks = [
    { label: 'Find Events', href: '/events' },
    { label: 'Events Today', href: '/events?date=today' },
    { label: 'Events This Weekend', href: '/events?date=weekend' },
]

const organiserLinks = [
    { label: 'Sell Tickets', href: '/sell-tickets' },
    { label: 'Become a Promoter', href: '/promoter/apply' },
]

const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
]

export function Footer() {
    return (
        <footer style={{ background: '#0A0A0F', color: '#FFFFFF' }}>
            <style>{`
                .footer-wrapper { padding: 60px 48px 0; }
                @media (max-width: 768px) { .footer-wrapper { padding: 40px 24px 0; } }

                .footer-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 40px;
                }
                @media (max-width: 900px) {
                    .footer-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 480px) {
                    .footer-grid { grid-template-columns: 1fr; }
                }

                .footer-link {
                    display: block;
                    font-size: 14px;
                    color: #8888AA;
                    margin-bottom: 12px;
                    text-decoration: none;
                    transition: color 0.15s;
                }
                .footer-link:hover { color: #FFFFFF; }

                .footer-social-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #8888AA;
                    text-decoration: none;
                    transition: border-color 0.15s, color 0.15s;
                    flex-shrink: 0;
                }
                .footer-social-btn:hover { border-color: #E63950; color: #E63950; }
            `}</style>

            <div className="footer-wrapper">
                {/* Top 4-column grid */}
                <div className="footer-grid">

                    {/* Column 1 — Brand */}
                    <div>
                        <div style={{
                            fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                            fontSize: '32px',
                            color: '#E63950',
                            letterSpacing: '4px',
                            marginBottom: '12px',
                        }}>
                            HEXLURA<sup style={{ fontSize: '0.45em', letterSpacing: 'normal' }}>®</sup>
                        </div>
                        <p style={{ fontSize: '13px', color: '#8888AA', marginBottom: '16px' }}>
                            The UK&apos;s home for live events
                        </p>
                        <div style={{ fontSize: '12px', color: '#8888AA', lineHeight: 1.8 }}>
                            <div>© 2026 Hexlura Ltd</div>
                            <div>Company No. 17102803</div>
                            <div>Registered in England &amp; Wales</div>
                        </div>

                        {/* Social icons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            {/* Instagram */}
                            <a href="https://www.instagram.com/hexlura" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-social-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                            </a>
                            {/* Facebook */}
                            <a href="https://www.facebook.com/share/17FUteK96w/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="footer-social-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                            </a>
                            {/* TikTok */}
                            <a href="https://www.tiktok.com/@hexlura" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="footer-social-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Column 2 — Discover */}
                    <div>
                        <p style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
                            Discover
                        </p>
                        {discoverLinks.map(l => (
                            <Link key={l.href} href={l.href} className="footer-link">{l.label}</Link>
                        ))}
                    </div>

                    {/* Column 3 — For Business */}
                    <div>
                        <p style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
                            For Business
                        </p>
                        {organiserLinks.map(l => (
                            <Link key={l.href} href={l.href} className="footer-link">{l.label}</Link>
                        ))}
                    </div>

                    {/* Column 4 — Legal */}
                    <div>
                        <p style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
                            Legal
                        </p>
                        {legalLinks.map(l => (
                            <Link key={l.href} href={l.href} className="footer-link">{l.label}</Link>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ marginTop: '48px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />

                {/* Bottom bar */}
                <div style={{
                    padding: '20px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <span style={{ fontSize: '12px', color: '#8888AA' }}>
                        © 2026 Hexlura Ltd · All rights reserved
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span style={{ fontSize: '12px', color: '#8888AA' }}>Payments secured by Stripe</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
