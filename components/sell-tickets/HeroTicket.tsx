'use client'

import { useEffect, useRef } from 'react'
import styles from './selling.module.css'

export default function HeroTicket() {
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const cardRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const wrap = wrapRef.current
        const card = cardRef.current
        if (!wrap || !card) return

        const finePointer = window.matchMedia('(pointer: fine)').matches
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (!finePointer || reduceMotion) {
            card.classList.add(styles.ticketCardBob)
            return
        }

        let raf = 0
        const handleMove = (e: MouseEvent) => {
            const rect = wrap.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width - 0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5
            if (raf) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(10px)`
                card.style.boxShadow = `${-x * 30}px ${20 + y * 20}px 60px -20px rgba(15,15,15,0.35)`
            })
        }
        const handleLeave = () => {
            card.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0)'
            card.style.boxShadow = '0 25px 50px -20px rgba(15,15,15,0.25)'
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

            <div ref={wrapRef} className={styles.ticketTiltWrap}>
                <div
                    ref={cardRef}
                    className={`${styles.ticketCard} relative bg-white border border-gray-200 shadow-2xl p-8 flex flex-col justify-between rounded-[28px]`}
                    style={{ minHeight: 400, boxShadow: '0 25px 50px -20px rgba(15,15,15,0.25)' }}
                >
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <p className="font-mono text-xs text-gray-400 mb-2">ADMIT ONE — ORGANISER COPY</p>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Summer Fest &apos;26</h3>
                            <p className="font-mono text-xs text-gray-500 mt-1">SERIAL HXL-004471 • QTY 1000 • £20.00</p>
                        </div>
                        <div
                            className={`${styles.spinStamp} w-20 h-20 flex flex-col rounded-full border-dashed border-2 border-hexyellow text-hexyellow items-center justify-center`}
                        >
                            <span className="font-black text-lg">100%</span>
                            <span className="font-black text-sm">YOURS</span>
                        </div>
                    </div>

                    <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <span className="text-gray-400">On a typical platform</span>
                            <span className="line-through text-gray-400">£20,000</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                            <span className="text-hexdark">On Hexlura</span>
                            <span className="text-hexred font-bold">full face value</span>
                        </div>
                        <div className="flex justify-between items-end pt-4">
                            <span className="font-bold text-lg">Total revenue</span>
                            <span className="font-black text-4xl">£20,000</span>
                        </div>
                    </div>
                    <div className="mt-12 h-12 w-full bg-barcode opacity-70 rounded-sm" />
                </div>
            </div>
        </div>
    )
}
