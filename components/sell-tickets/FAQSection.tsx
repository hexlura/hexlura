'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'

const faqs = [
    {
        q: 'Do you really take 0% commission?',
        a: "Yes, exactly 0%. Hexlura takes £0 commission from your ticket sales. Unlike traditional ticketing platforms that charge heavy platform fees, we let you keep 100% of your ticket revenue. You only cover standard payment processing fees charged directly by Stripe.",
    },
    {
        q: 'When do I get paid?',
        a: 'Instantly / Direct Payouts! Because Hexlura integrates directly with your own Stripe Connect account, ticket revenues are transferred straight into your connected bank account as sales happen—no waiting until the event is over to get your money.',
    },
    {
        q: 'Is there a monthly or setup fee?',
        a: "No hidden costs, no setup fees, and no monthly subscription required to list your events. You can sign up, create an event, and start selling tickets completely free.",
    },
    {
        q: 'How do customer check-ins work on the event day?',
        a: 'Every ticket buyer receives a unique, secure QR code upon purchase. You or your door team can use the Hexlura Organiser Dashboard / QR Scanner to scan tickets at the door instantly, ensuring smooth and fast entry.',
    },
    {
        q: 'Do I own my attendee data?',
        a: '100% yes. You retain full ownership of your customer list, emails, and sales analytics. Hexlura will never gate your data or market competitor events to your audience.',
    },
    {
        q: 'How long does it take to set up an event?',
        a: 'Less than 5 minutes! Simply create your free Hexlura account, set up your event details and ticket tiers, connect your Stripe account, and your custom event page is live and ready to sell.',
    },
    {
        q: 'What happens if an event is canceled?',
        a: 'You have full control from your Organiser Dashboard. You can issue full or partial refunds directly to your buyers via Stripe with just a few clicks.',
    },
]

// Animated Typewriter Headline matching Twitch Rivals FAQ title
function TypewriterTitle({ text = 'FAQs', className = '' }: { text?: string; className?: string }) {
    const [charCount, setCharCount] = useState(-1)
    const titleRef = useRef<HTMLHeadingElement | null>(null)

    useEffect(() => {
        const el = titleRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setCharCount(0)
                }
            },
            { threshold: 0.15 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (charCount < 0 || charCount >= text.length) return
        const timer = setTimeout(() => {
            setCharCount((prev) => prev + 1)
        }, 90)
        return () => clearTimeout(timer)
    }, [charCount, text.length])

    const isComplete = charCount >= text.length

    return (
        <h2 ref={titleRef} className={className}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="inline-flex items-baseline font-black tracking-tight">
                {text.split('').map((char, i) => {
                    const isVisible = i < charCount
                    const isCurrent = i === charCount
                    return (
                        <span key={i} className="relative inline-block">
                            <span className={`transition-opacity duration-75 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                                {char}
                            </span>
                            {isCurrent && (
                                <span className="absolute top-0 left-0 text-hexred animate-pulse">_</span>
                            )}
                        </span>
                    )
                })}
                {isComplete && (
                    <span className="inline-block text-hexred animate-pulse ml-0.5 font-mono font-normal">_</span>
                )}
            </span>
        </h2>
    )
}

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)
    const [scrollYProgress, setScrollYProgress] = useState(0)
    const [isDesktop, setIsDesktop] = useState(false)
    const [translateY, setTranslateY] = useState(0)
    const [spacerHeight, setSpacerHeight] = useState(700)

    const containerRef = useRef<HTMLElement | null>(null)
    const stickyRef = useRef<HTMLDivElement | null>(null)
    const rightListRef = useRef<HTMLDivElement | null>(null)

    // Smoothed scroll progress (lerped toward the raw target every frame for a fluid feel)
    const targetProgressRef = useRef(0)
    const smoothProgressRef = useRef(0)

    // Media query check
    useEffect(() => {
        const checkDesktop = () => {
            const matches = window.matchMedia('(min-width: 768px)').matches
            setIsDesktop(matches)
        }
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        return () => window.removeEventListener('resize', checkDesktop)
    }, [])

    // Recalculate spacer height and scroll translation
    useEffect(() => {
        if (!isDesktop) {
            setTranslateY(0)
            setScrollYProgress(1)
            targetProgressRef.current = 1
            smoothProgressRef.current = 1
            return
        }

        let measureRafId: number
        let lerpRafId: number
        const maxScrollDistanceRef = { current: 0 }

        const updateMeasurements = () => {
            if (!containerRef.current || !rightListRef.current) return

            const windowHeight = window.innerHeight
            const listHeight = rightListRef.current.offsetHeight
            const availableHeight = windowHeight - 220
            const maxScrollDistance = Math.max(0, listHeight - availableHeight)
            maxScrollDistanceRef.current = maxScrollDistance

            // Dynamic spacer height based on list height to allow full scrolling
            const calculatedSpacer = Math.max(650, maxScrollDistance + 250)
            setSpacerHeight(calculatedSpacer)

            const rect = containerRef.current.getBoundingClientRect()
            const totalScrollable = rect.height - windowHeight

            if (totalScrollable > 0) {
                const currentScroll = -rect.top
                const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1)
                targetProgressRef.current = progress
            } else {
                targetProgressRef.current = 0
            }
        }

        const onScroll = () => {
            cancelAnimationFrame(measureRafId)
            measureRafId = requestAnimationFrame(updateMeasurements)
        }

        // Continuously eases the smoothed progress toward the raw scroll target,
        // decoupling the animation from scroll-event frequency for a fluid, non-jittery feel.
        const lerpTick = () => {
            const current = smoothProgressRef.current
            const target = targetProgressRef.current
            const next = current + (target - current) * 0.12

            if (Math.abs(target - next) < 0.0005) {
                smoothProgressRef.current = target
            } else {
                smoothProgressRef.current = next
            }

            setScrollYProgress(smoothProgressRef.current)
            setTranslateY(-smoothProgressRef.current * maxScrollDistanceRef.current)

            lerpRafId = requestAnimationFrame(lerpTick)
        }

        updateMeasurements()
        lerpRafId = requestAnimationFrame(lerpTick)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', updateMeasurements)

        return () => {
            cancelAnimationFrame(measureRafId)
            cancelAnimationFrame(lerpRafId)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', updateMeasurements)
        }
    }, [isDesktop, openIndex])

    // Image reveal opacity calculation
    const img1Opacity = 1
    const img2Opacity = useMemo(() => {
        if (!isDesktop) return 1
        return Math.min(Math.max((scrollYProgress - 0.15) / 0.2, 0), 1)
    }, [scrollYProgress, isDesktop])

    const img3Opacity = useMemo(() => {
        if (!isDesktop) return 1
        return Math.min(Math.max((scrollYProgress - 0.38) / 0.2, 0), 1)
    }, [scrollYProgress, isDesktop])

    return (
        <section
            id="faqs"
            ref={containerRef}
            className="relative z-10 w-full bg-black text-white selection:bg-hexred selection:text-white"
        >
            <div
                ref={stickyRef}
                className={isDesktop ? 'sticky top-0 overflow-hidden min-h-screen' : 'relative py-20 md:py-28'}
            >
                <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12 pt-20 md:pt-28 pb-12">
                    <div className="flex h-full flex-col md:flex-row gap-8 lg:gap-16 items-start">
                        {/* Left Column: Heading & Stacked Floating Images */}
                        <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col justify-start">
                            <TypewriterTitle
                                text="FAQs"
                                className="mb-6 md:mb-10 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white uppercase tracking-tighter"
                            />

                            {/* Stacked Images matching Twitch Rivals interactive aesthetic */}
                            <div className="relative pl-1 sm:pl-2 w-full max-w-[340px] sm:max-w-[400px] md:max-w-none aspect-[4/3]">
                                {/* Image 1 (Base Layer) */}
                                <div
                                    className="w-4/5 sm:w-5/6 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-neutral-900 relative transition-transform duration-500 hover:scale-[1.02]"
                                    style={{ opacity: img1Opacity }}
                                >
                                    <Image
                                        src="/assets/images/FAQ_1.jpg"
                                        alt="Hexlura Ticketing Experience"
                                        fill
                                        sizes="(max-width: 768px) 80vw, 35vw"
                                        className="object-cover brightness-95"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                </div>

                                {/* Image 2 (Middle Layer) */}
                                <div
                                    className="absolute top-6 left-6 sm:top-8 sm:left-8 w-4/5 sm:w-5/6 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-neutral-900 transition-all duration-500 hover:scale-[1.02]"
                                    style={{
                                        opacity: img2Opacity,
                                        transform: `translate3d(0, 0, 0) rotate(${isDesktop ? '2deg' : '0deg'})`,
                                    }}
                                >
                                    <Image
                                        src="/assets/images/FAQ_2.jpeg"
                                        alt="Live Event Community"
                                        fill
                                        sizes="(max-width: 768px) 80vw, 35vw"
                                        className="object-cover brightness-95"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                </div>

                                {/* Image 3 (Top Layer) */}
                                <div
                                    className="absolute top-12 left-12 sm:top-16 sm:left-16 w-4/5 sm:w-5/6 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] bg-neutral-900 transition-all duration-500 hover:scale-[1.02]"
                                    style={{
                                        opacity: img3Opacity,
                                        transform: `translate3d(0, 0, 0) rotate(${isDesktop ? '-1.5deg' : '0deg'})`,
                                    }}
                                >
                                    <Image
                                        src="/assets/images/FAQ_3.jpg"
                                        alt="Sold Out Arena Entry"
                                        fill
                                        sizes="(max-width: 768px) 80vw, 35vw"
                                        className="object-cover brightness-95"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Expanding Staggered Accordion List */}
                        <div className="relative w-full md:w-7/12 lg:w-2/3 ml-auto">
                            <div
                                ref={rightListRef}
                                style={isDesktop ? { transform: `translate3d(0, ${translateY}px, 0)`, willChange: 'transform' } : undefined}
                                className="flex flex-col gap-2.5 sm:gap-3 pb-16 md:pb-24"
                            >
                                {faqs.map((faq, index) => {
                                    const isOpen = openIndex === index

                                    // Dynamic width calculation matching Twitch Rivals staircase expanding accordion
                                    const progressClamped = Math.min(Math.max((scrollYProgress - 0) / 0.85, 0), 1)
                                    const initialWidth = 100 - (index / faqs.length) * 45
                                    const currentWidth = isDesktop
                                        ? initialWidth + (100 - initialWidth) * progressClamped
                                        : 100

                                    return (
                                        <div
                                            key={faq.q}
                                            style={isDesktop ? { width: `${currentWidth}%` } : { width: '100%' }}
                                            className={`
                                                ml-auto border-2 transition-colors duration-300 bg-black/60 backdrop-blur-sm
                                                ${isOpen ? 'border-hexred' : 'border-white hover:border-hexred'}
                                            `}
                                        >
                                            {/* Toggle Button */}
                                            <button
                                                type="button"
                                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                                className="group flex w-full cursor-pointer items-center gap-3 sm:gap-4 px-3 sm:px-5 py-4 sm:py-5 text-left focus:outline-none"
                                                aria-expanded={isOpen}
                                            >
                                                <span
                                                    className={`
                                                        flex-shrink-0 text-2xl sm:text-3xl font-bold font-mono transition-colors duration-200 leading-none select-none
                                                        ${isOpen ? 'text-hexred' : 'text-white group-hover:text-hexred group-focus:text-hexred'}
                                                    `}
                                                >
                                                    {isOpen ? '−' : '+'}
                                                </span>
                                                <span
                                                    className={`
                                                        text-lg sm:text-xl md:text-2xl font-bold tracking-tight transition-colors duration-200 select-none
                                                        ${isOpen ? 'text-hexred' : 'text-white group-hover:text-hexred group-focus:text-hexred'}
                                                    `}
                                                >
                                                    {faq.q}
                                                </span>
                                            </button>

                                            {/* Expandable Answer Panel with signature Twitch Rivals square marker */}
                                            <div
                                                className={`
                                                    grid transition-[grid-template-rows,opacity] duration-300 ease-out overflow-hidden
                                                    ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                                                `}
                                            >
                                                <div className="overflow-hidden min-h-0">
                                                    <div className="mr-auto flex max-w-2xl gap-3 px-5 sm:px-8 md:px-12 pb-6 pt-1 text-white">
                                                        <div className="bg-hexred mt-2 size-2.5 sm:size-3 shrink-0 rounded-none shadow-[0_0_10px_rgba(234,40,69,0.7)]" />
                                                        <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed font-sans">
                                                            {faq.a}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop spacer to power the sticky scroll animation */}
            {isDesktop && <div style={{ height: `${spacerHeight}px` }} aria-hidden="true" />}
        </section>
    )
}
