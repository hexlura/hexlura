'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './selling.module.css'
import { useInView } from './Reveal'

type Feature = { icon: string; title: string; desc: string }
type Accent = 'red'
type Category = { label: string; accent: Accent; features: Feature[] }

const categories: Category[] = [
    {
        label: 'Tickets & Events',
        accent: 'red',
        features: [
            { icon: '🎫', title: 'Multiple Ticket Tiers', desc: 'Create general admission, VIP, early bird, and group ticket tiers with custom quantity limits per event.' },
            { icon: '♾️', title: 'Unlimited Events & Tickets', desc: 'Run unlimited events and sell uncapped ticket volumes with zero platform restrictions.' },
            { icon: '⏰', title: 'Sale Windows', desc: 'Schedule exact start and end dates for ticket sales to automate releases in advance.' },
            { icon: '🎟️', title: 'Comp Ticket Generation', desc: 'Generate complimentary tickets instantly with individual redemption codes.' },
            { icon: '⏳', title: 'Waitlists & Holds', desc: 'Capture excess demand via automatic event waitlists and hold ticket reservations during checkout.' },
            { icon: '📝', title: 'Attendee Data Collection', desc: 'Collect custom buyer info including names, emails, dietary needs, or notes during checkout.' },
        ],
    },
    {
        label: 'Marketing & Promotion',
        accent: 'red',
        features: [
            { icon: '🤝', title: 'Built-In Promoter Network', desc: 'Invite promoters with custom commission rates, tracked links, and real-time sales attribution.' },
            { icon: '🏷️', title: 'Promo & Discount Codes', desc: 'Create fixed or percentage discount codes with usage limits, expiry dates, and auto-apply links.' },
            { icon: '🔗', title: 'Unique Referral Tracking', desc: 'Generate unique tracking links and QR codes for every marketing channel and promoter.' },
            { icon: '⭐', title: 'Social Event Reviews', desc: 'Allow verified attendees to rate, review, and leave public feedback on past events.' },
            { icon: '🔔', title: 'Organiser Follows', desc: 'Enable buyers to follow organiser profile pages to receive automated launch updates.' },
            { icon: '🖼️', title: 'Public Organiser Portfolios', desc: 'Customise branded public profile pages displaying upcoming and past event catalogs.' },
        ],
    },
    {
        label: 'Analytics & Payouts',
        accent: 'red',
        features: [
            { icon: '📈', title: 'Real-Time Sales Dashboard', desc: 'Track live gross revenue, net earnings, fee breakdowns, and sales velocity charts.' },
            { icon: '🎟️', title: 'Per-Ticket Breakdown', desc: 'Monitor sales volume, revenue per tier, and capacity remaining in real time.' },
            { icon: '💳', title: 'Stripe & Klarna BNPL', desc: 'Accept major card payments securely via Stripe Elements alongside Klarna Buy-Now-Pay-Later.' },
            { icon: '📅', title: 'Flexible Payout Options', desc: 'Receive payouts via Stripe Connect or direct bank transfers with complete withdrawal logs.' },
            { icon: '🗂️', title: '100% Data Ownership & Exports', desc: 'Export full attendee contact lists, sales ledgers, and financial reports in CSV format with one click.' },
            { icon: '🧾', title: 'Automated PDF Invoices', desc: 'Auto-generate downloadable HTML and PDF financial invoices for every transaction.' },
        ],
    },
    {
        label: 'Check-In & On-Site',
        accent: 'red',
        features: [
            { icon: '📷', title: 'Web QR Scanner', desc: 'Scan attendee tickets from any browser-enabled phone or tablet without downloading apps.' },
            { icon: '📲', title: 'Multi-Device Door Staff', desc: 'Invite team members with dedicated check-in permissions for concurrent scanning at gate entrances.' },
            { icon: '✅', title: 'Live Attendance Stats', desc: 'Monitor real-time checked-in vs total attendee counts categorized per ticket tier.' },
        ],
    },
]

const accentClasses: Record<Accent, { text: string; border: string; glow: string }> = {
    red: {
        text: 'text-hexred',
        border: 'hover:border-hexred/40',
        glow: 'rgba(234,40,69,0.16)',
    }
}

function FeatureCard({ feature, accent, index }: { feature: Feature; accent: Accent; index: number }) {
    const { ref, active } = useInView<HTMLDivElement>(0.15)
    const cardRef = useRef<HTMLDivElement | null>(null)
    const [pos, setPos] = useState({ x: 50, y: 50 })
    const a = accentClasses[accent]

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        const el = cardRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        setPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
    }

    return (
        <div
            ref={(node) => {
                ref.current = node
                cardRef.current = node
            }}
            onMouseMove={handleMouseMove}
            className={`group relative overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/80 p-5 transition-[transform,border-color,background-color] duration-300 ease-in-out hover:-translate-y-1 hover:bg-neutral-900 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${a.border} ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                } transition-[opacity,transform] duration-500 ease-out`}
            style={{
                transitionDelay: active ? `${Math.min(index * 70, 400)}ms` : '0ms',
            }}
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100 motion-reduce:!opacity-0"
                style={{
                    background: `radial-gradient(220px circle at ${pos.x}% ${pos.y}%, ${a.glow}, transparent 70%)`,
                }}
            />
            <h4 className="relative mb-1.5 flex items-center gap-2 text-base font-semibold text-white">
                <span className="inline-block transition-transform duration-300 ease-in-out group-hover:scale-[1.15] group-hover:rotate-[4deg] motion-reduce:group-hover:transform-none">
                    {feature.icon}
                </span>
                {feature.title}
            </h4>
            <p className="relative text-sm leading-relaxed text-neutral-400">{feature.desc}</p>
        </div>
    )
}

function KineticGrid({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const pointerRef = useRef({ x: 0, y: 0, active: false })
    const ripplesRef = useRef<{ x: number; y: number; start: number }[]>([])
    const rafRef = useRef<number | undefined>(undefined)

    useEffect(() => {
        const canvas = canvasRef.current
        const section = sectionRef.current
        if (!canvas || !section) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const SPACING = 64
        const STEP = 16
        const RADIUS = 240
        const PULL = 22
        const RIPPLE_DURATION = 900
        const RIPPLE_MAX_RADIUS = 520
        const RIPPLE_AMPLITUDE = 26
        const RIPPLE_BAND = 60

        let width = 0
        let height = 0

        function resize() {
            const rect = section!.getBoundingClientRect()
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            width = rect.width
            height = rect.height
            canvas!.width = width * dpr
            canvas!.height = height * dpr
            canvas!.style.width = `${width}px`
            canvas!.style.height = `${height}px`
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(section)

        function displace(px: number, py: number, now: number): [number, number] {
            let dx = 0
            let dy = 0
            const { x: mx, y: my, active } = pointerRef.current
            if (active) {
                const ddx = mx - px
                const ddy = my - py
                const dist = Math.hypot(ddx, ddy)
                if (dist < RADIUS && dist > 0.01) {
                    const t = 1 - dist / RADIUS
                    const f = t * t * PULL
                    dx += (ddx / dist) * f
                    dy += (ddy / dist) * f
                }
            }
            for (const r of ripplesRef.current) {
                const t = (now - r.start) / RIPPLE_DURATION
                if (t < 0 || t > 1) continue
                const rippleRadius = t * RIPPLE_MAX_RADIUS
                const rdx = px - r.x
                const rdy = py - r.y
                const dist = Math.hypot(rdx, rdy)
                const band = Math.abs(dist - rippleRadius)
                if (band < RIPPLE_BAND && dist > 0.01) {
                    const bandFalloff = 1 - band / RIPPLE_BAND
                    const fade = 1 - t
                    const amp = RIPPLE_AMPLITUDE * bandFalloff * fade
                    dx += (rdx / dist) * amp
                    dy += (rdy / dist) * amp
                }
            }
            return [px + dx, py + dy]
        }

        function draw(now: number) {
            ctx!.clearRect(0, 0, width, height)
            ctx!.strokeStyle = 'rgba(255,255,255,0.07)'
            ctx!.lineWidth = 1

            for (let gx = 0; gx <= width + SPACING; gx += SPACING) {
                ctx!.beginPath()
                for (let gy = 0; gy <= height; gy += STEP) {
                    const [x, y] = displace(gx, gy, now)
                    if (gy === 0) ctx!.moveTo(x, y)
                    else ctx!.lineTo(x, y)
                }
                ctx!.stroke()
            }
            for (let gy = 0; gy <= height + SPACING; gy += SPACING) {
                ctx!.beginPath()
                for (let gx = 0; gx <= width; gx += STEP) {
                    const [x, y] = displace(gx, gy, now)
                    if (gx === 0) ctx!.moveTo(x, y)
                    else ctx!.lineTo(x, y)
                }
                ctx!.stroke()
            }

            if (ripplesRef.current.length) {
                ripplesRef.current = ripplesRef.current.filter((r) => now - r.start < RIPPLE_DURATION)
            }
        }

        function loop(now: number) {
            draw(now)
            rafRef.current = requestAnimationFrame(loop)
        }

        if (reduced) {
            draw(performance.now())
        } else {
            rafRef.current = requestAnimationFrame(loop)
        }

        function onPointerMove(e: PointerEvent) {
            const rect = section!.getBoundingClientRect()
            pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true }
        }
        function onPointerLeave() {
            pointerRef.current.active = false
        }
        function onPointerDown(e: PointerEvent) {
            if (reduced) return
            const rect = section!.getBoundingClientRect()
            ripplesRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, start: performance.now() })
        }

        section.addEventListener('pointermove', onPointerMove)
        section.addEventListener('pointerleave', onPointerLeave)
        section.addEventListener('pointerdown', onPointerDown)

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            ro.disconnect()
            section.removeEventListener('pointermove', onPointerMove)
            section.removeEventListener('pointerleave', onPointerLeave)
            section.removeEventListener('pointerdown', onPointerDown)
        }
    }, [sectionRef])

    return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 block opacity-[0.9]" />
}

function CategoryBlock({ category }: { category: Category }) {
    const { ref, active } = useInView<HTMLDivElement>(0.2)
    const a = accentClasses[category.accent]

    return (
        <div className="py-12 first:pt-0 last:pb-0">
            <h3
                ref={ref}
                className={`mb-6 text-sm font-bold uppercase tracking-wider transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${a.text} ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                    }`}
            >
                {category.label}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.features.map((f, i) => (
                    <FeatureCard key={f.title} feature={f} accent={category.accent} index={i} />
                ))}
            </div>
        </div>
    )
}

export default function FeaturesSection() {
    const sectionRef = useRef<HTMLElement | null>(null)

    return (
        <section id="features" ref={sectionRef} className="relative scroll-mt-28 overflow-hidden bg-neutral-950 py-24">
            <KineticGrid sectionRef={sectionRef} />
            <div
                className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-[0.1] blur-[100px]"
                style={{ background: 'radial-gradient(circle, #ea2845, transparent 70%)' }}
            />
            <div
                className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full opacity-[0.1] blur-[100px]"
                style={{ background: 'radial-gradient(circle, #7c5cff, transparent 70%)' }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="mb-16 max-w-2xl">
                    <div className="mb-4 inline-block rounded-full border border-hexred/30 bg-hexred/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-hexred">
                        Everything, unlocked
                    </div>
                    <h2 className="mb-4 text-4xl font-black tracking-tighter text-white md:text-5xl">
                        BUILT FOR ORGANISERS, <span className={styles.gradText}>NOT OVERHEADS.</span>
                    </h2>
                    <p className="text-lg text-neutral-400">
                        No tricky tiers to access your own data. Every feature below is unlocked from the moment
                        you sign up.
                    </p>
                </div>

                <div className="divide-y divide-neutral-800/60">
                    {categories.map((category) => (
                        <CategoryBlock key={category.label} category={category} />
                    ))}
                </div>
            </div>
        </section>
    )
}
