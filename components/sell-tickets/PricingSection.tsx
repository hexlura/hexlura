import Link from 'next/link'
import styles from './selling.module.css'
import { Reveal } from './Reveal'

export default function PricingSection({ ctaHref }: { ctaHref: string }) {
    return (
        <section className="py-32 bg-hexdark text-white relative overflow-hidden">
            <div className={`${styles.meshBg} opacity-40`}>
                <div className={`${styles.blob} ${styles.blobDrift} w-[35rem] h-[35rem] bg-hexred/20 -top-20 -left-20`} />
                <div className={`${styles.blob} ${styles.blobDriftSlow} w-[25rem] h-[25rem] bg-hexviolet/20 bottom-10 right-10`} />
            </div>
            <Reveal className="max-w-7xl mx-auto px-6 relative z-10">
                <>
                    <div className="text-center mb-20">
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            SCALABLE POWER
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                            CHOOSE YOUR <span className="text-white">ARSENAL.</span>
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Selling tickets is always free. Upgrade your toolkit to drive massive growth, run complex
                            campaigns, and dominate your marketing.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                        <div className={`${styles.pricingCard} ${styles.glowHoverDark} bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm`}>
                            <h3 className="font-mono text-sm tracking-widest text-gray-400 uppercase mb-2">Base</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black">£0</span>
                                <span className="text-gray-400 text-sm">/mo</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">
                                Everything you need to list an event and sell out fast.
                            </p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />0% commission on tickets</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Instant payouts in 2 days</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />QR code scanning app</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Full buyer data access</li>
                            </ul>
                            <Link href={ctaHref} className="block w-full py-3 px-6 rounded-full border border-white/20 text-center font-bold text-sm hover:bg-white hover:text-hexdark transition-colors">
                                Start Free
                            </Link>
                        </div>

                        <div className={`${styles.pricingCard} bg-gradient-to-b from-hexred/10 to-transparent border-2 border-hexred rounded-3xl p-8 transform lg:scale-105 shadow-[0_20px_50px_-12px_rgba(234,40,69,0.3)] relative z-10`}>
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-hexred text-white text-xs font-mono font-bold px-4 py-1 rounded-full tracking-wider">
                                MOST POPULAR
                            </div>
                            <h3 className="font-mono text-sm tracking-widest text-hexred uppercase mb-2">Pro</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-5xl font-black">£29</span>
                                <span className="text-gray-400 text-sm">/mo</span>
                            </div>
                            <p className="text-sm text-gray-300 mb-8 pb-8 border-b border-white/10">
                                Supercharge your marketing and maximize attendance.
                            </p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Everything in Base</li>
                                <li className="flex items-center gap-3 font-bold text-white"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Promo &amp; discount codes</li>
                                <li className="flex items-center gap-3 font-bold text-white"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Direct email campaigns</li>
                                <li className="flex items-center gap-3 font-bold text-white"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Referral &amp; affiliate tracking</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexred" />Custom checkout questions</li>
                            </ul>
                            <Link href={ctaHref} className="block w-full py-4 px-6 rounded-full bg-hexred text-white text-center font-bold text-sm shadow-[0_10px_20px_-5px_rgba(234,40,69,0.4)] hover:bg-white hover:text-hexred transition-colors">
                                Upgrade to Pro
                            </Link>
                        </div>

                        <div className={`${styles.pricingCard} ${styles.glowHoverDark} bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm`}>
                            <h3 className="font-mono text-sm tracking-widest text-hexviolet uppercase mb-2">Pro Plus</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black">£99</span>
                                <span className="text-gray-400 text-sm">/mo</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">
                                For enterprise organizers needing scale and white-labeling.
                            </p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexviolet" />Everything in Pro</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexviolet" />White-label box office</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexviolet" />Dedicated account manager</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-hexviolet" />API access &amp; webhooks</li>
                            </ul>
                            <Link href="/contact" className="block w-full py-3 px-6 rounded-full border border-white/20 text-center font-bold text-sm hover:bg-white hover:text-hexdark transition-colors">
                                Contact Sales
                            </Link>
                        </div>
                    </div>

                    <div className="text-center mt-12 font-mono text-xs text-gray-500">
                        Cancel or downgrade anytime. No long-term contracts.
                    </div>
                </>
            </Reveal>
        </section>
    )
}
