'use client'

import styles from './selling.module.css'
import AdmitOneTicket from './admit-one-ticket'

export default function HeroTicket() {
    return (
        <div className="relative hidden md:block">
            <div className="absolute -inset-10 bg-hexred/20 blur-3xl opacity-60 rounded-full" />
            <div className="absolute -inset-10 bg-hexviolet/10 blur-3xl opacity-60 rounded-full translate-x-10 translate-y-10" />

            <div
                className={`${styles.floatChip} absolute -top-8 -left-8 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-2`}
                style={{ ['--r' as string]: '-8deg' }}
            >
                <div className="w-8 h-8 rounded-full bg-hexyellow/20 flex items-center justify-center text-hexyellow font-black text-xs">✓</div>
                <div className="text-xs font-mono leading-tight">
                    <p className="font-bold text-hexdark">Payout sent</p>
                    <p className="text-gray-400">£20,000.00</p>
                </div>
            </div>

            <div
                className={`${styles.floatChip2} absolute -bottom-6 -right-6 z-20 bg-hexdark text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2`}
                style={{ ['--r' as string]: '6deg' }}
            >
                <div className="w-2 h-2 rounded-full bg-hexred animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider">LIVE · 1,204 SOLD</span>
            </div>

            <div className="flex items-center justify-center">
                <AdmitOneTicket
                    name="For Organisers"
                    presenter="Hexlura presents"
                    event="Your Complete Event Department"
                    venue="United Kingdom"
                    dates=""
                    stubText="Admit one"
                    watermark="2026"
                    width={600}
                />
            </div>
        </div>
    )
}
