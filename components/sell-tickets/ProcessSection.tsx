'use client'

import styles from './selling.module.css'
import { Reveal, useInView } from './Reveal'
import TutorialCarousel from './TutorialCarousel'

const steps = [
    {
        num: '01',
        label: 'Step 01 - Sign Up',
        title: 'Create your account',
        desc: 'Sign up free in seconds. No credit card required.',
        icon: (
            <div className="w-8 h-8 rounded-full border-2 border-hexred flex items-center justify-center mb-2">
                <div className="w-2 h-2 rounded-full bg-hexred" />
            </div>
        ),
    },
    {
        num: '02',
        label: 'Step 02 - Payouts',
        title: 'Connect payouts',
        desc: 'Link your bank securely to receive your funds.',
        icon: <div className="text-3xl text-hexred font-mono">£</div>,
    },
    {
        num: '03',
        label: 'Step 03 - Build',
        title: 'Build your event',
        desc: 'Add details, tickets, and go live instantly.',
        icon: (
            <div className="w-6 h-6 border border-hexdark flex flex-col justify-evenly p-1">
                <div className="w-full h-0.5 bg-hexred" />
                <div className="w-full h-0.5 bg-hexred" />
                <div className="w-full h-0.5 bg-hexred" />
            </div>
        ),
    },
    {
        num: '04',
        label: 'Step 04 - Get Paid',
        title: 'Get paid in full',
        desc: 'Receive 100% of face value after your event.',
        icon: (
            <svg className="w-8 h-8 text-hexred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
        ),
    },
]

function ConnectorLine() {
    const { ref, active } = useInView<HTMLDivElement>(0.4)
    return (
        <div ref={ref}>
            <svg className="hidden md:block absolute top-16 left-0 w-full h-2 -z-10" viewBox="0 0 800 4" preserveAspectRatio="none">
                <line x1="0" y1="2" x2="800" y2="2" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="6 8" />
                <line
                    className={`${styles.drawLine} ${active ? styles.active : ''}`}
                    x1="0"
                    y1="2"
                    x2="800"
                    y2="2"
                    stroke="#ea2845"
                    strokeWidth="2"
                    strokeDasharray="1000"
                />
            </svg>
        </div>
    )
}

export default function ProcessSection({ downloadSlot }: { downloadSlot?: React.ReactNode }) {
    return (
        <section id="how-it-works" className="py-24 bg-white relative overflow-hidden scroll-mt-28">
            <div className="max-w-7xl mx-auto px-6">
                <Reveal className="mb-20 text-center">
                    <>
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            FOUR STEPS
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            UP AND RUNNING BEFORE <span className={styles.gradText}>THE KETTLE BOILS.</span>
                        </h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">
                            No approval queue. No sales call. Create your account and start selling the same day.
                        </p>
                    </>
                </Reveal>

                <div className="relative max-w-4xl mx-auto mb-24">
                    <ConnectorLine />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6">
                        {steps.map((step, i) => (
                            <Reveal key={step.num} delayMs={i * 100} className="relative group text-center md:text-left">
                                <>
                                    <div
                                        className={`bg-white border-2 border-gray-200 p-6 rounded-2xl shadow-sm ${styles.liftHover} group-hover:border-hexred relative z-10 mx-auto md:mx-0 w-48 h-32 flex flex-col justify-center items-center md:items-start mb-6`}
                                    >
                                        <div className="absolute top-4 right-4 text-4xl font-black text-gray-100 font-mono">{step.num}</div>
                                        {step.icon}
                                    </div>
                                    <p className="font-mono text-xs text-gray-400 mb-1 uppercase tracking-wider">{step.label}</p>
                                    <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                                    <p className="text-sm text-gray-500">{step.desc}</p>
                                </>
                            </Reveal>
                        ))}
                    </div>
                </div>

                {downloadSlot && (
                    <Reveal className="mt-16 text-center">
                        <>{downloadSlot}</>
                    </Reveal>
                )}

                <TutorialCarousel />
            </div>
        </section>
    )
}
