'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import styles from './selling.module.css'
import { Reveal } from './Reveal'
import AmbientParticles from './AmbientParticles'

/**
 * Pattern-break section, roughly mid-scroll. Reinforces the single core
 * value prop at large scale rather than adding another feature card.
 */
export default function MidBanner({ ctaHref }: { ctaHref: string }) {
    const sectionRef = useRef<HTMLElement | null>(null)
    const layerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const section = sectionRef.current
        const layer = layerRef.current
        if (!section || !layer) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        let raf = 0
        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                raf = 0
                const rect = section.getBoundingClientRect()
                const vh = window.innerHeight || 1
                const progress = (vh - rect.top) / (vh + rect.height)
                const clamped = Math.min(1, Math.max(0, progress))
                const shift = (clamped - 0.5) * 60
                layer.style.transform = `translateY(${shift}px)`
            })
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => {
            window.removeEventListener('scroll', onScroll)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <section
            ref={sectionRef}
            className="relative py-32 md:py-44 bg-hexdark text-white overflow-hidden"
        >
            <AmbientParticles density={70} className="opacity-70" />

            <div
                ref={layerRef}
                className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] rounded-full bg-hexred/20 blur-[120px] will-change-transform"
                aria-hidden="true"
            />

            {/* Boardroom cutout composited against this section's own dark
                background rather than its original photo backdrop — ties the
                pattern-break moment back to the brand photography. */}
            <div
                className="absolute -bottom-24 right-[-10%] w-[42rem] max-w-[70vw] opacity-15 pointer-events-none select-none"
                style={{ maskImage: 'linear-gradient(to top, black 40%, transparent 95%)', WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 95%)' }}
                aria-hidden="true"
            >
                <Image
                    src="/assets/images/Hexlura_desk.png"
                    alt=""
                    width={1536}
                    height={1024}
                    className="w-full h-auto"
                />
            </div>

            {/* Oversized ticket-stub motif — perforated divider at large scale */}
            <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px opacity-20"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(to right, #fff 0, #fff 10px, transparent 10px, transparent 26px)',
                }}
                aria-hidden="true"
            />

            <Reveal className="relative z-10 max-w-4xl mx-auto px-6 text-center" scale>
                <>
                    <div className="inline-flex items-center gap-2 border border-hexred/50 text-hexred px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-widest mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-hexred animate-pulse" />
                        Zero commission, always
                    </div>

                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.92] mb-8">
                        WE DON&apos;T TOUCH YOUR
                        <br />
                        <span className={styles.gradText}>TICKET PRICE.</span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Every other platform takes a cut before you see a penny. Hexlura charges organisers
                        nothing — the buyer&apos;s small booking fee is the only fee anywhere in the chain.
                    </p>

                    <Link
                        href={ctaHref}
                        className={`${styles.btnPrimary} inline-block bg-hexred text-white font-bold py-5 px-10 rounded-full uppercase tracking-wider text-sm shadow-[0_20px_50px_-12px_rgba(234,40,69,0.6)]`}
                    >
                        Start selling commission-free
                    </Link>
                </>
            </Reveal>
        </section>
    )
}
