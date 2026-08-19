'use client'

import React from 'react'
import { Reveal } from './Reveal'
import styles from './selling.module.css'

// ─── Stickers ───────────────────────────────────────────────────────────────
// Flat, two-tone 2D illustrations matching Hexlura's clean icon style.

function CalendarSparkleIcon() {
    return (
        <svg viewBox="0 0 160 160" className="w-full h-full" fill="none">
            <rect x="24" y="34" width="98" height="94" rx="18" fill="#0f0f0f" />
            <rect x="24" y="34" width="98" height="26" rx="13" fill="#0f0f0f" />
            <rect x="34" y="70" width="78" height="48" rx="8" fill="#ffffff" />
            <rect x="44" y="20" width="10" height="24" rx="5" fill="#0f0f0f" />
            <rect x="92" y="20" width="10" height="24" rx="5" fill="#0f0f0f" />
            <rect x="44" y="82" width="14" height="14" rx="3" fill="#ff6f9a" />
            <rect x="64" y="82" width="14" height="14" rx="3" fill="#0f0f0f" opacity="0.12" />
            <rect x="84" y="82" width="14" height="14" rx="3" fill="#0f0f0f" opacity="0.12" />
            <rect x="44" y="100" width="14" height="14" rx="3" fill="#0f0f0f" opacity="0.12" />
            <rect x="64" y="100" width="14" height="14" rx="3" fill="#0f0f0f" opacity="0.12" />
            <path
                d="M124 24l4.5 11 11 4.5-11 4.5-4.5 11-4.5-11-11-4.5 11-4.5 4.5-11z"
                fill="#ff6f9a"
            />
            <path
                d="M136 100l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3 3-7.5z"
                fill="#0f0f0f"
            />
        </svg>
    )
}

function TicketIcon() {
    return (
        <svg viewBox="0 0 160 160" className="w-full h-full" fill="none">
            <path
                d="M20 62a14 14 0 0114-14h92a14 14 0 0114 14v6a12 12 0 000 24v6a14 14 0 01-14 14H34a14 14 0 01-14-14v-6a12 12 0 000-24v-6z"
                fill="#0f0f0f"
            />
            <line x1="80" y1="48" x2="80" y2="112" stroke="#ffffff" strokeWidth="3" strokeDasharray="6 7" />
            <rect x="44" y="66" width="22" height="22" rx="4" fill="#ffffff" />
            <rect x="49" y="71" width="5" height="5" fill="#0f0f0f" />
            <rect x="57" y="71" width="5" height="5" fill="#0f0f0f" />
            <rect x="49" y="79" width="5" height="5" fill="#0f0f0f" />
            <circle cx="102" cy="72" r="4" fill="#3a9dfb" />
            <rect x="94" y="86" width="24" height="4" rx="2" fill="#3a9dfb" />
            <rect x="94" y="94" width="16" height="4" rx="2" fill="#ffffff" opacity="0.6" />
        </svg>
    )
}

function ShieldLockIcon() {
    return (
        <svg viewBox="0 0 160 160" className="w-full h-full" fill="none">
            <path
                d="M80 18l46 16v38c0 34-20 58-46 70-26-12-46-36-46-70V34l46-16z"
                fill="#0f0f0f"
            />
            <path
                d="M80 30l34 12v30c0 26-15 44-34 53-19-9-34-27-34-53V42l34-12z"
                fill="#ffffff"
            />
            <rect x="62" y="76" width="36" height="28" rx="6" fill="#0f0f0f" />
            <path d="M68 76v-8a12 12 0 0124 0v8" stroke="#0f0f0f" strokeWidth="6" fill="none" />
            <circle cx="80" cy="90" r="4" fill="#ffffff" />
        </svg>
    )
}

function ChartIcon() {
    return (
        <svg viewBox="0 0 160 160" className="w-full h-full" fill="none">
            <rect x="24" y="112" width="112" height="6" rx="3" fill="#0f0f0f" opacity="0.15" />
            <rect x="36" y="86" width="20" height="32" rx="4" fill="#0f0f0f" opacity="0.18" />
            <rect x="70" y="64" width="20" height="54" rx="4" fill="#0f0f0f" opacity="0.28" />
            <rect x="104" y="40" width="20" height="78" rx="4" fill="#7c5cff" />
            <path
                d="M32 78l30-20 26 12 38-34"
                stroke="#0f0f0f"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <circle cx="126" cy="36" r="8" fill="#7c5cff" />
        </svg>
    )
}

type StackCard = {
    id: number
    num: string
    title: string
    subtitle: string
    bg: string
    textColor: string
    subtextColor: string
    badgeBg: string
    badgeText: string
    icon: React.ReactNode
    rotation: string
}

const cards: StackCard[] = [
    {
        id: 1,
        num: '01',
        title: 'Event Creation',
        subtitle: 'Host, customize, and launch events effortlessly.',
        bg: 'bg-[#FFA6C9]',
        textColor: 'text-hexdark',
        subtextColor: 'text-hexdark/80',
        badgeBg: 'bg-black/10',
        badgeText: 'text-hexdark',
        icon: <CalendarSparkleIcon />,
        rotation: '-rotate-6',
    },
    {
        id: 2,
        num: '02',
        title: 'Ticket Management',
        subtitle: 'Issue, track, and tier tickets in real time.',
        bg: 'bg-[#7BD3EA]',
        textColor: 'text-hexdark',
        subtextColor: 'text-hexdark/80',
        badgeBg: 'bg-black/10',
        badgeText: 'text-hexdark',
        icon: <TicketIcon />,
        rotation: 'rotate-6',
    },
    {
        id: 3,
        num: '03',
        title: 'Secure Booking',
        subtitle: 'Encrypted, lightning-fast checkout for attendees.',
        bg: 'bg-[#E02424]',
        textColor: 'text-white',
        subtextColor: 'text-white/90',
        badgeBg: 'bg-white/20',
        badgeText: 'text-white',
        icon: <ShieldLockIcon />,
        rotation: '-rotate-12',
    },
    {
        id: 4,
        num: '04',
        title: 'Real-Time Insights',
        subtitle: 'Live analytics tracking revenue, sales, and attendance.',
        bg: 'bg-[#C4A4F9]',
        textColor: 'text-hexdark',
        subtextColor: 'text-hexdark/80',
        badgeBg: 'bg-black/10',
        badgeText: 'text-hexdark',
        icon: <ChartIcon />,
        rotation: 'rotate-12',
    },
]

export default function StickyStackCards() {
    return (
        <section className="py-24 bg-hexlight relative scroll-mt-28">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <Reveal className="mb-16 md:mb-20 max-w-2xl mx-auto text-center">
                    <>
                        <div className="inline-block bg-hexdark text-white px-3.5 py-1 rounded-full font-mono text-xs mb-4 uppercase tracking-widest font-semibold shadow-sm">
                            Platform Features
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 text-hexdark">
                            FROM <span className={styles.gradText}>IDEA TO SOLD OUT.</span>
                        </h2>
                        <p className="text-gray-600 text-lg md:text-xl font-medium">
                            Four pillars that carry your event from the first draft to the final scan.
                        </p>
                    </>
                </Reveal>

                {/* Sticky Cards Stack Container */}
                <div className="relative pb-24 md:pb-36">
                    {cards.map((card, index) => {
                        return (
                            <div
                                key={card.id}
                                className={`
                                    sticky w-full rounded-[2.5rem] md:rounded-[3rem] 
                                    p-8 sm:p-12 md:p-14 lg:p-16 
                                    flex flex-col md:flex-row items-center justify-between 
                                    shadow-[0_20px_50px_rgba(0,0,0,0.18)] border-2 border-black/10
                                    mb-10 sm:mb-12 lg:mb-16
                                    transition-all duration-300 origin-top
                                    ${card.bg} ${card.textColor}
                                `}
                                style={{
                                    top: `calc(5.5rem + ${index * 32}px)`,
                                    zIndex: index + 1,
                                }}
                            >
                                {/* Card Text Content */}
                                <div className="md:w-3/5 space-y-4 md:space-y-6 z-10 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${card.badgeBg} ${card.badgeText}`}>
                                            Step {card.num}
                                        </span>
                                    </div>
                                    <h3 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-tight">
                                        {card.title}
                                    </h3>
                                    <p className={`text-lg sm:text-xl md:text-2xl font-medium ${card.subtextColor} max-w-xl leading-relaxed`}>
                                        {card.subtitle}
                                    </p>
                                </div>

                                {/* Card Illustration */}
                                <div className="md:w-2/5 flex justify-center md:justify-end mt-8 md:mt-0 z-10 w-full">
                                    <div className={`w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 ${card.rotation} drop-shadow-[8px_8px_0_rgba(0,0,0,0.12)] transition-transform duration-500 hover:scale-110`}>
                                        {card.icon}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

