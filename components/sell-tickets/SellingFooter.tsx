import Link from 'next/link'
import styles from './selling.module.css'
import { Reveal } from './Reveal'

const discoverLinks = [
    { label: 'Find Events', href: '/events' },
    { label: 'Events Today', href: '/events?date=today' },
    { label: 'Events This Weekend', href: '/events?date=weekend' },
]

const businessLinks = [
    { label: 'Sell Tickets', href: '/sell-tickets' },
    { label: 'Become a Promoter', href: '/promoter/apply' },
]

const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
]

export default function SellingFooter({ ctaHref }: { ctaHref: string }) {
    return (
        <footer className="bg-hexdark text-white pt-24 pb-12 border-t border-gray-800 relative overflow-hidden">
            <div className={`${styles.meshBg} opacity-50`}>
                <div className={`${styles.blob} ${styles.blobDrift} w-[30rem] h-[30rem] bg-hexred/30 -top-32 left-1/4`} />
                <div className={`${styles.blob} ${styles.blobDriftSlow} w-96 h-96 bg-hexviolet/30 bottom-0 right-0`} />
            </div>
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <Reveal className="text-center mb-24">
                    <>
                        <div className="flex items-center justify-center space-x-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-hexyellow" />
                            <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">Join Hexlura</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            CREATE YOUR EVENT.
                            <br />
                            <span className="text-hexred">KEEP EVERYTHING.</span>
                        </h2>
                        <p className="text-gray-400 max-w-xl mx-auto mb-8 font-mono text-sm">
                            No setup fees. No monthly fees. No contracts. Just your event, and your money.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <Link
                                href={ctaHref}
                                className={`${styles.btnPrimary} bg-hexred text-white font-bold py-4 px-8 rounded-full text-center uppercase tracking-wider text-sm shadow-[0_0_30px_rgba(234,40,69,0.5)]`}
                            >
                                Create your free account
                            </Link>
                            <Link
                                href="/auth/login"
                                className={`${styles.btnGhost} bg-transparent text-white font-bold py-4 px-8 rounded-full border-2 border-white hover:border-gray-400 hover:text-gray-400 text-center uppercase tracking-wider text-sm`}
                            >
                                Sign in
                            </Link>
                        </div>
                    </>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-t border-gray-800 pt-12">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <span className="text-xl text-hexred font-black tracking-tighter">HEXLURA®</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mb-4">The UK&apos;s home for live events</p>
                        <p className="text-xs text-gray-600 font-mono leading-relaxed">
                            © 2026 Hexlura Ltd
                            <br />
                            Company No. 17022833
                            <br />
                            Registered in England &amp; Wales
                        </p>
                        <div className="flex space-x-4 mt-6">
                            <a
                                href="https://www.instagram.com/hexlura"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="text-gray-500 hover:text-white transition-colors hover:-translate-y-0.5 inline-block duration-300"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </a>
                            <a
                                href="https://www.facebook.com/share/17FUteK96w/?mibextid=wwXIfr"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="text-gray-500 hover:text-white transition-colors hover:-translate-y-0.5 inline-block duration-300"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.tiktok.com/@hexlura"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="TikTok"
                                className="text-gray-500 hover:text-white transition-colors hover:-translate-y-0.5 inline-block duration-300"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h5 className="font-mono text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Discover</h5>
                        <ul className="space-y-3 text-sm text-gray-300">
                            {discoverLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="hover:text-hexred transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-mono text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">For Business</h5>
                        <ul className="space-y-3 text-sm text-gray-300">
                            {businessLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="hover:text-hexred transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-mono text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Legal</h5>
                        <ul className="space-y-3 text-sm text-gray-300">
                            {legalLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="hover:text-hexred transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs font-mono text-gray-600">
                    <p>© 2026 Hexlura Ltd. All rights reserved.</p>
                    <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Payments secured by Stripe</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
