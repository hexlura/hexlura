import styles from './selling.module.css'
import { Reveal } from './Reveal'

type Feature = { title: string; desc: string; icon: React.ReactNode; iconBg: string }

const ticketFeatures: Feature[] = [
    {
        title: 'Instant ticket sales',
        desc: 'Go live the moment you publish. No approval delays, ever.',
        iconBg: 'bg-hexred/10',
        icon: <div className="w-2 h-2 bg-hexred rounded-full group-hover:animate-ping" />,
    },
    {
        title: 'QR code tickets',
        desc: 'Every order gets a unique code. Scan attendees in with the built-in app.',
        iconBg: 'bg-hexdark/5',
        icon: (
            <div className="w-4 h-4 border border-hexdark grid grid-cols-2 gap-[1px] p-[1px]">
                <div className="bg-hexdark" />
                <div className="bg-hexdark" />
                <div className="bg-hexdark" />
                <div />
            </div>
        ),
    },
    {
        title: 'Group tickets',
        desc: 'Sell packages with an individual QR code generated for each member.',
        iconBg: 'bg-hexviolet/10',
        icon: (
            <svg className="w-5 h-5 text-hexviolet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
            </svg>
        ),
    },
]

const marketingFeatures: Feature[] = [
    {
        title: 'Promo codes',
        desc: 'Create fixed or percentage discounts for early birds, press or VIPs instantly.',
        iconBg: 'bg-hexyellow/15',
        icon: (
            <svg className="w-5 h-5 text-hexyellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
        ),
    },
    {
        title: 'Email campaigns',
        desc: 'Reach past attendees directly from your dashboard when you announce your next date.',
        iconBg: 'bg-hexcyan/10',
        icon: (
            <svg className="w-5 h-5 text-hexcyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        title: 'Referral tracking',
        desc: 'Generate unique tracking links. See exactly which channel — or friend — sold each ticket.',
        iconBg: 'bg-hexviolet/10',
        icon: (
            <svg className="w-5 h-5 text-hexviolet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        ),
    },
]

const analyticsFeatures: Feature[] = [
    {
        title: 'Live dashboard',
        desc: 'Revenue, scans and attendance, updating in real time.',
        iconBg: 'bg-hexdark/5',
        icon: (
            <svg className="w-5 h-5 text-hexdark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        title: 'Fast payouts',
        desc: 'Funds land in your account 2 business days after your event.',
        iconBg: 'bg-hexyellow/15',
        icon: (
            <svg className="w-5 h-5 text-hexyellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    },
    {
        title: 'Buyer data, always',
        desc: 'Export attendee contact details whenever you need them. No paid tier.',
        iconBg: 'bg-hexred/10',
        icon: (
            <svg className="w-5 h-5 text-hexdark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
    },
]

function FeatureCard({ feature }: { feature: Feature }) {
    return (
        <div className={`bg-white border border-gray-200 p-6 rounded-2xl ${styles.glowHover} group cursor-default`}>
            <div className="flex items-center space-x-3 mb-4">
                <div className={`w-9 h-9 rounded-xl ${feature.iconBg} flex items-center justify-center`}>{feature.icon}</div>
                <h4 className="font-bold text-lg">{feature.title}</h4>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
        </div>
    )
}

function FeatureGroup({ heading, features, accent }: { heading: string; features: Feature[]; accent?: boolean }) {
    return (
        <div>
            <h3
                className={`font-mono text-sm font-bold mb-4 uppercase tracking-widest border-b border-gray-300 pb-2 ${accent ? 'text-hexred' : 'text-gray-400'}`}
            >
                {heading}
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
                {features.map((f) => (
                    <FeatureCard key={f.title} feature={f} />
                ))}
            </div>
        </div>
    )
}

export default function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-hexlight relative overflow-hidden scroll-mt-28">
            <div className={`${styles.meshBg} opacity-30`}>
                <div className={`${styles.blob} ${styles.blobDrift} w-96 h-96 bg-hexcyan/30 -bottom-20 -right-20`} />
            </div>
            <Reveal className="max-w-7xl mx-auto px-6 relative z-10">
                <>
                    <div className="mb-16 max-w-2xl">
                        <div className="inline-block bg-hexred text-white px-3 py-1 rounded-full font-mono text-xs mb-4 uppercase tracking-widest">
                            Everything Included
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            BUILT FOR ORGANISERS, <span className={styles.gradText}>NOT OVERHEADS.</span>
                        </h2>
                        <p className="text-gray-500 text-lg">
                            No tricky tiers to access your own data. Every feature below is unlocked from the moment
                            you sign up.
                        </p>
                    </div>

                    <div className="space-y-16">
                        <FeatureGroup heading="Tickets & Sales" features={ticketFeatures} />
                        <FeatureGroup heading="Marketing & Growth" features={marketingFeatures} accent />
                        <FeatureGroup heading="Analytics & Payouts" features={analyticsFeatures} />
                    </div>
                </>
            </Reveal>
        </section>
    )
}
