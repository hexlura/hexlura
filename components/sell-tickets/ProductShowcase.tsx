'use client'

import { useEffect, useRef } from 'react'
import styles from './selling.module.css'
import HeroTicket from './HeroTicket'
import { Reveal } from './Reveal'

const highlights = [
    { label: 'Discovery', text: 'Attendees browse live events seamlessly by category, city, and date.' },
    { label: 'Checkout', text: 'Stripe-secured payment in a few taps, with zero account friction.' },
    { label: 'Delivery', text: 'QR tickets land instantly — ready to scan on the door.' },
]

/**
 * "See Hexlura in action" — the buyer-facing app as proof the product is
 * real and live, not a mockup of a promise. Ground-truth palette source.
 */
export default function ProductShowcase() {
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const frameRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const wrap = wrapRef.current
        const frame = frameRef.current
        if (!wrap || !frame) return

        const finePointer = window.matchMedia('(pointer: fine)').matches
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!finePointer || reduceMotion) return

        let raf = 0
        const handleMove = (e: MouseEvent) => {
            const rect = wrap.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width - 0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5
            if (raf) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                frame.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`
            })
        }
        const handleLeave = () => {
            frame.style.transform = 'rotateY(0deg) rotateX(0deg)'
        }

        wrap.addEventListener('mousemove', handleMove)
        wrap.addEventListener('mouseleave', handleLeave)
        return () => {
            wrap.removeEventListener('mousemove', handleMove)
            wrap.removeEventListener('mouseleave', handleLeave)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <Reveal className="order-2 lg:order-1">
                    <>
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            SEE HEXLURA IN ACTION
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            YOUR EVENT,<span className={styles.gradText}>PUBLISHED DIRECTLY TO YOUR ATTENDEES INSTANTLY.</span>
                        </h2>
                        <p className="text-gray-500 text-lg mb-10 max-w-lg">
                            This isn&apos;t just an idea anymore — Once your event is published, your mobile-optimized web storefront goes live, ready to be found, bought and scanned.
                        </p>

                        <ul className="space-y-6">
                            {highlights.map((h, i) => (
                                <Reveal key={h.label} delayMs={i * 120} as="li" className="flex gap-4">
                                    <>
                                        <span className="font-mono text-xs font-bold text-hexred border border-hexred/40 rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-sm uppercase tracking-wide mb-1">{h.label}</p>
                                            <p className="text-gray-500 text-sm leading-relaxed">{h.text}</p>
                                        </div>
                                    </>
                                </Reveal>
                            ))}
                        </ul>
                    </>
                </Reveal>

                <Reveal scale className="order-1 lg:order-2 flex justify-center">
                    {/* <div ref={wrapRef} className={`${styles.ticketTiltWrap} relative`}>
                        <div className="absolute -inset-16 bg-hexred/10 blur-3xl rounded-full" aria-hidden="true" />
                        <div
                            ref={frameRef}
                            className={`${styles.ticketCard} ${styles.floatChip} relative w-[280px] md:w-[320px]`}
                            style={{ ['--r' as string]: '0deg', animationDuration: '9s' }}
                        >
                            <Image
                                src="/assets/images/Hexlura_hand_phone.png"
                                alt="Hexlura app home screen held in hand, showing live events, category chips and Explore by City"
                                width={1024}
                                height={1536}
                                className="w-full h-auto drop-shadow-[0_35px_60px_rgba(15,15,15,0.35)]"
                                priority={false}
                            />
                        </div>
                    </div> */}

                    <HeroTicket />
                </Reveal>
            </div>
        </section>
    )
}
