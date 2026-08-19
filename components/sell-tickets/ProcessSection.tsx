'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { UserRoundPlus, Wallet, LayoutTemplate, BadgeCheck, type LucideIcon } from 'lucide-react'
import styles from './selling.module.css'
import { Reveal, useInView } from './Reveal'
import TutorialCarousel from './TutorialCarousel'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

type Step = {
    num: string
    label: string
    title: string
    desc: string
    gradient: string
    text: 'dark' | 'light'
    Icon: LucideIcon
}

const steps: Step[] = [
    {
        num: '01',
        label: 'Step 01 - Sign Up',
        title: 'Create your account',
        desc: 'Sign up free in seconds. No credit card required.',
        gradient: 'linear-gradient(155deg, #ffd6e6 0%, #ff9dc0 100%)',
        text: 'dark',
        Icon: UserRoundPlus,
    },
    {
        num: '02',
        label: 'Step 02 - Payouts',
        title: 'Connect payouts',
        desc: 'Link your bank securely to receive your funds.',
        gradient: 'linear-gradient(155deg, #bfeaf5 0%, #7bd3ea 100%)',
        text: 'dark',
        Icon: Wallet,
    },
    {
        num: '03',
        label: 'Step 03 - Build',
        title: 'Build your event',
        desc: 'Add details, tickets, and go live instantly.',
        gradient: 'linear-gradient(155deg, #e6dbff 0%, #c4a4f9 100%)',
        text: 'dark',
        Icon: LayoutTemplate,
    },
    {
        num: '04',
        label: 'Step 04 - Get Paid',
        title: 'Get paid in full',
        desc: 'Receive 100% of face value after your event.',
        gradient: 'linear-gradient(155deg, #ff4d67 0%, #ea2845 100%)',
        text: 'light',
        Icon: BadgeCheck,
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

// Mobile: the zigzag/horizontal connector collapses awkwardly, so steps get
// their own vertical spine that draws in as each step scrolls into view.
function MobileConnector() {
    const { ref, active } = useInView<HTMLDivElement>(0.3)
    return (
        <div ref={ref} className="md:hidden absolute left-6 top-4 bottom-4 w-px -z-10">
            <div className="absolute inset-0 bg-gray-200" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #e5e7eb 0, #e5e7eb 6px, transparent 6px, transparent 14px)' }} />
            <div
                className="absolute inset-x-0 top-0 bg-hexred origin-top transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ height: '100%', transform: active ? 'scaleY(1)' : 'scaleY(0)' }}
            />
        </div>
    )
}

// Desktop, motion-safe only: a pinned full-screen showcase whose scroll
// range is scrubbed into a single GSAP timeline — intro copy dissolves away,
// then each step's card and icon crossfade/slide in as the section scrolls
// through it. Mirrors the scroll-jacking pattern used elsewhere on this page
// (MidBanner, StickyStackCards) but driven by GSAP's ScrollTrigger scrub
// instead of a hand-rolled rAF listener, since the timeline here has many
// overlapping tweens that are easier to sequence declaratively.
function PinnedShowcase() {
    const sectionRef = useRef<HTMLElement>(null)

    const introNumberRef = useRef<HTMLDivElement>(null)
    const introHeadingRef = useRef<HTMLDivElement>(null)
    const introTextRef = useRef<HTMLParagraphElement>(null)

    const showcaseRef = useRef<HTMLDivElement>(null)
    const mediaStageRef = useRef<HTMLDivElement>(null)

    const mediaRefs = useRef<(HTMLDivElement | null)[]>([])
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])
    const descRefs = useRef<(HTMLParagraphElement | null)[]>([])
    const progressRefs = useRef<(HTMLDivElement | null)[]>([])
    const iconBadgeRefs = useRef<(HTMLDivElement | null)[]>([])

    useLayoutEffect(() => {
        if (!sectionRef.current) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        const ctx = gsap.context(() => {
            const medias = mediaRefs.current.filter(Boolean) as HTMLDivElement[]
            const items = itemRefs.current.filter(Boolean) as HTMLDivElement[]
            const descriptions = descRefs.current.filter(Boolean) as HTMLParagraphElement[]
            const progresses = progressRefs.current.filter(Boolean) as HTMLDivElement[]
            const iconBadges = iconBadgeRefs.current.filter(Boolean) as HTMLDivElement[]

            gsap.set(showcaseRef.current, { autoAlpha: 0 })

            gsap.set(mediaStageRef.current, {
                clipPath: 'inset(35% 28% 35% 28%)',
                scale: 1.05,
            })

            medias.forEach((media, index) => {
                gsap.set(media, {
                    opacity: index === 0 ? 1 : 0,
                    scale: index === 0 ? 1.06 : 1.1,
                    yPercent: index === 0 ? 0 : 8,
                })
            })

            items.forEach((item, index) => {
                gsap.set(item, { opacity: index === 0 ? 1 : 0.28 })
            })

            descriptions.forEach((desc, index) => {
                gsap.set(desc, { opacity: index === 0 ? 1 : 0, y: index === 0 ? 0 : 20 })
            })

            progresses.forEach((progress, index) => {
                gsap.set(progress, { scaleX: index === 0 ? 1 : 0, transformOrigin: 'left center' })
            })

            iconBadges.forEach((badge, index) => {
                gsap.set(badge, {
                    opacity: index === 0 ? 1 : 0,
                    scale: index === 0 ? 1 : 0.6,
                    rotate: index === 0 ? 0 : -14,
                })
            })

            // Continuous idle bob, independent of scroll — the icon inside
            // whichever card is active should never feel static.
            gsap.to(iconBadges, {
                y: '+=8',
                duration: 2.2,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                stagger: { each: 0.3, from: 'random' },
            })

            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1,
                    invalidateOnRefresh: true,
                },
            })

            /*
             * INTRO
             */

            timeline
                .to(introNumberRef.current, {
                    scale: 0.48,
                    xPercent: -25,
                    yPercent: -18,
                    transformOrigin: 'left top',
                    ease: 'none',
                    duration: 1,
                }, 0)

                .to(introHeadingRef.current, {
                    xPercent: 20,
                    yPercent: -15,
                    opacity: 0,
                    ease: 'none',
                    duration: 0.65,
                }, 0.1)

                .to(introTextRef.current, {
                    y: -80,
                    opacity: 0,
                    ease: 'none',
                    duration: 0.5,
                }, 0.25)

                .to(introNumberRef.current, { opacity: 0, duration: 0.3 }, 0.7)

            /*
             * SHOWCASE REVEAL
             */

            timeline
                .to(showcaseRef.current, { autoAlpha: 1, duration: 0.35 }, 0.58)

                .to(mediaStageRef.current, {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    scale: 1,
                    ease: 'power3.inOut',
                    duration: 0.8,
                }, 0.6)

                .to(medias[0], { scale: 1, duration: 0.8, ease: 'power3.out' }, 0.6)

                .fromTo(iconBadges[0], { scale: 0.6, rotate: -14, opacity: 0 }, {
                    scale: 1,
                    rotate: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: 'back.out(1.7)',
                }, 0.75)

            /*
             * STEP TRANSITIONS
             */

            const stepStart = [1.65, 2.7, 3.75]
            stepStart.forEach((start, i) => {
                const from = i
                const to = i + 1

                timeline
                    .to(medias[from], { opacity: 0, scale: 0.96, yPercent: -6, duration: 0.35 }, start)

                    .fromTo(
                        medias[to],
                        { opacity: 0, scale: 1.08, yPercent: 8, clipPath: 'inset(100% 0% 0% 0%)' },
                        {
                            opacity: 1,
                            scale: 1,
                            yPercent: 0,
                            clipPath: 'inset(0% 0% 0% 0%)',
                            duration: 0.6,
                            ease: 'power3.inOut',
                        },
                        start - 0.03,
                    )

                    .to(items[from], { opacity: 0.28, duration: 0.25 }, start)
                    .to(items[to], { opacity: 1, duration: 0.25 }, start)

                    .to(descriptions[from], { opacity: 0, y: -15, duration: 0.2 }, start - 0.03)

                    .fromTo(
                        descriptions[to],
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.35 },
                        start + 0.1,
                    )

                    .to(progresses[from], { scaleX: 0, duration: 0.25 }, start - 0.03)
                    .to(progresses[to], { scaleX: 1, duration: 0.35 }, start + 0.05)

                    .to(iconBadges[from], { opacity: 0, scale: 0.6, rotate: 14, duration: 0.25 }, start)
                    .fromTo(
                        iconBadges[to],
                        { opacity: 0, scale: 0.6, rotate: -14 },
                        { opacity: 1, scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(1.7)' },
                        start + 0.15,
                    )
            })

            timeline.to(medias[3], { scale: 0.985, duration: 0.7 }, 4.55)
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const iconColor = (text: Step['text']) => (text === 'light' ? '#ffffff' : '#101010')

    return (
        <section
            ref={sectionRef}
            className="hidden md:block motion-reduce:!hidden relative h-[570vh] bg-[#f1f0eb] text-[#101010]"
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">

                {/* Intro */}

                <div className="absolute inset-0 z-10 flex h-screen items-center">
                    <div className="mx-auto grid w-full max-w-[1800px] grid-cols-12 px-5 md:px-10 lg:px-14">



                        <div ref={introNumberRef} className="col-span-5 flex items-center">
                            <span className="block text-[34vw] font-medium leading-[0.7] tracking-[-0.09em] lg:text-[30vw]">
                                4
                            </span>
                        </div>

                        <div ref={introHeadingRef} className="col-span-7 flex items-center pl-4 md:pl-8">
                            <h2 className="text-[11vw] font-black lowercase leading-[0.78] tracking-[-0.075em] lg:text-[8.5vw]">
                                simple
                                <br />
                                <span className={styles.gradText}>steps.</span>
                            </h2>
                        </div>

                        <p
                            ref={introTextRef}
                            className="col-span-6 col-start-7 mt-14 max-w-3xl text-lg leading-[1.2] tracking-[-0.03em] text-black md:text-2xl lg:text-[2rem]"
                        >
                            No approval queue. No sales call. Create your account and start selling the same day.
                        </p>
                    </div>
                </div>

                {/* Process Showcase */}

                <div ref={showcaseRef} className="absolute inset-0 z-20 h-screen">
                    <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col px-4 pb-5 pt-5 md:px-8 md:pb-8 md:pt-8">

                        {/* Main animated card */}

                        <div ref={mediaStageRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem]">
                            {steps.map((step, index) => (
                                <div
                                    key={step.num}
                                    ref={(element) => { mediaRefs.current[index] = element }}
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ background: step.gradient, color: step.text === 'light' ? '#fff' : '#101010' }}
                                >
                                    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 lg:p-14">

                                        {/* top */}

                                        <div className="flex items-start justify-between">
                                            <span className="font-mono text-[11px] uppercase tracking-[0.08em] md:text-xs">
                                                {step.label}
                                            </span>

                                            <span className="font-medium leading-none tracking-[-0.07em] text-[clamp(5rem,12vw,14rem)]">
                                                {step.num}
                                            </span>
                                        </div>

                                        {/* bottom */}

                                        <div>
                                            <div
                                                ref={(element) => { iconBadgeRefs.current[index] = element }}
                                                className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border-[3px] md:h-20 md:w-20 lg:h-24 lg:w-24"
                                                style={{ borderColor: iconColor(step.text) }}
                                            >
                                                <step.Icon
                                                    className="h-7 w-7 md:h-9 md:w-9 lg:h-10 lg:w-10"
                                                    style={{ color: iconColor(step.text) }}
                                                    strokeWidth={2.2}
                                                />
                                            </div>

                                            <h3 className="max-w-[1100px] text-[clamp(3.5rem,8vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em]">
                                                {step.title}
                                            </h3>

                                            <p className="mt-6 max-w-[480px] text-lg leading-[1.25] tracking-[-0.025em] md:text-2xl">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Navigation rows */}

                        <div className="grid shrink-0 grid-cols-1 border-x border-b border-black bg-[#f1f0eb] md:grid-cols-4">
                            {steps.map((step, index) => (
                                <div
                                    key={step.num}
                                    ref={(element) => { itemRefs.current[index] = element }}
                                    className={`relative min-h-[130px] px-4 py-4 md:min-h-[165px] md:px-5 md:py-5 lg:min-h-[190px] lg:px-6 lg:py-6 ${index !== steps.length - 1 ? 'border-b border-black md:border-b-0 md:border-r' : ''
                                        }`}
                                >
                                    <div className="absolute left-0 top-0 h-px w-full bg-black/15">
                                        <div
                                            ref={(element) => { progressRefs.current[index] = element }}
                                            className="h-full w-full bg-black"
                                        />
                                    </div>

                                    <div className="mb-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.06em]">
                                        <span className="flex items-center gap-2">
                                            <step.Icon className="h-3.5 w-3.5 text-hexred" strokeWidth={2.4} />
                                            {step.num}
                                        </span>
                                        <span>{step.label}</span>
                                    </div>

                                    <h4 className="text-[clamp(1.35rem,2vw,2.6rem)] font-medium leading-[0.95] tracking-[-0.05em]">
                                        {step.title}
                                    </h4>

                                    <p
                                        ref={(element) => { descRefs.current[index] = element }}
                                        className="mt-3 max-w-[310px] text-xs leading-[1.35] md:text-sm"
                                    >
                                        {step.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// Mobile and prefers-reduced-motion fallback: the original static vertical
// stepper. Scroll-jacking is a poor fit for touch scrolling, and a pinned
// section is exactly the kind of movement reduced-motion users opt out of.
function StaticSteps() {
    return (
        <div className="relative max-w-4xl mx-auto mb-24">
            <ConnectorLine />
            <MobileConnector />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
                {steps.map((step, i) => (
                    <Reveal
                        key={step.num}
                        delayMs={i * 120}
                        className="relative group text-left md:text-left pl-16 md:pl-0"
                    >
                        <>
                            <div
                                className="absolute left-0 top-0 md:hidden w-12 h-12 rounded-full bg-hexdark text-white flex items-center justify-center font-mono font-black text-sm z-10"
                                aria-hidden="true"
                            >
                                {step.num}
                            </div>
                            <div
                                className={`bg-white border-2 border-gray-200 p-6 rounded-2xl shadow-sm ${styles.liftHover} group-hover:border-hexred relative z-10 mx-auto md:mx-0 w-full md:w-48 h-24 md:h-32 flex flex-row md:flex-col justify-start md:justify-center items-center md:items-start gap-4 md:gap-0 mb-6`}
                            >
                                <div className="hidden md:block absolute top-4 right-4 text-4xl font-black text-gray-100 font-mono">
                                    {step.num}
                                </div>
                                <div className={`${styles.floatChip} w-10 h-10 rounded-full border-2 border-hexred flex items-center justify-center`}>
                                    <step.Icon className="w-5 h-5 text-hexred" strokeWidth={2.2} />
                                </div>
                            </div>
                            <p className="font-mono text-xs text-gray-400 mb-1 uppercase tracking-wider">{step.label}</p>
                            <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                            <p className="text-sm text-gray-500">{step.desc}</p>
                        </>
                    </Reveal>
                ))}
            </div>
        </div>
    )
}

export default function ProcessSection({ downloadSlot }: { downloadSlot?: React.ReactNode }) {
    return (
        <section id="how-it-works" className="pb-24 bg-white relative scroll-mt-28">
            {/* No overflow-hidden here: it would become position:sticky's
                containing scroll frame instead of the viewport, and since this
                section never scrolls internally, the pinned showcase below
                would never appear to move. Clip only within PinnedShowcase. */}
            {/* Shown whenever the static fallback is: mobile always, plus
                desktop under prefers-reduced-motion (the pinned showcase
                supplies its own copy of this heading for the motion-safe path). */}
            <div className="max-w-7xl mx-auto px-6 md:hidden motion-reduce:!block">
                <Reveal className="mb-16 text-center">
                    <>
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            FOUR STEPS
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter mb-4">
                            UP AND RUNNING BEFORE <span className={styles.gradText}>THE KETTLE BOILS.</span>
                        </h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">
                            No approval queue. No sales call. Create your account and start selling the same day.
                        </p>
                    </>
                </Reveal>

                <StaticSteps />
            </div>

            <div className="mb-24">
                <PinnedShowcase />
            </div>

            <div className="max-w-7xl mx-auto px-6">
                {downloadSlot && (
                    <Reveal className="mt-4 text-center">
                        <>{downloadSlot}</>
                    </Reveal>
                )}

                <TutorialCarousel />
            </div>
        </section>
    )
}
