'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { HandwritingSvg } from '@/components/ui/handwriting-svg'

const STEPS = [
    { text: 'Hey', duration: 1.8, hold: 1000 },
    { text: 'Welcome to', duration: 2.2, hold: 900 },
    { text: 'Hexlura', duration: 2.6, hold: 700 },
] as const

export default function IntroSequence({ children }: { children: React.ReactNode }) {
    const [step, setStep] = useState(0)
    const [isSequenceComplete, setIsSequenceComplete] = useState(false)
    const [pointerEventsEnabled, setPointerEventsEnabled] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    // Advance the handwriting sequence, respecting reduced-motion by skipping straight to the end.
    useEffect(() => {
        if (typeof window === 'undefined') return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setStep(STEPS.length - 1)
            setIsSequenceComplete(true)
            return
        }

        if (step >= STEPS.length) return

        const { duration, hold } = STEPS[step]
        const timer = setTimeout(
            () => {
                if (step < STEPS.length - 1) setStep(step + 1)
                else setIsSequenceComplete(true)
            },
            duration * 1000 + hold
        )

        return () => clearTimeout(timer)
    }, [step])

    // Lock body scroll until the handwriting sequence finishes.
    useEffect(() => {
        if (isSequenceComplete) return

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [isSequenceComplete])

    const { scrollY } = useScroll()
    const { scrollYProgress: localProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    })

    const scale = useTransform(scrollY, [0, 300], [1, 45])
    const loaderOpacity = useTransform(localProgress, [0.6, 1], [1, 0])
    const contentOpacity = useTransform(localProgress, [0.6, 1], [0, 1])
    const contentY = useTransform(localProgress, [0.6, 1], [40, 0])

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setPointerEventsEnabled(latest === 0)
    })

    return (
        <div className="relative">
            <div
                ref={containerRef}
                className="relative"
                style={{
                    height: '220vh',
                    // Before the sequence completes, scroll is locked at the body level,
                    // so collapsing this to the viewport height avoids reserving dead space.
                    ...(isSequenceComplete ? {} : { height: '100vh' }),
                }}
            >
                <motion.div
                    className="sticky top-0 left-0 w-full h-screen flex flex-col items-center justify-center overflow-hidden z-20"
                    style={{
                        opacity: loaderOpacity,
                        pointerEvents: pointerEventsEnabled ? 'auto' : 'none',
                    }}
                >
                    <div className="absolute inset-0 bg-[#08080a]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-hexred/10 blur-[120px] rounded-full pointer-events-none" />
                    </div>

                    <motion.div
                        className="relative w-full max-w-4xl aspect-[16/9] mx-8 flex items-center justify-center"
                        style={{
                            scale: step >= 2 ? scale : 1,
                            transformOrigin: '52% 48%',
                        }}
                    >
                        <div className="w-full h-full flex items-center justify-center px-10 relative z-10 text-hexred">
                            <AnimatePresence mode="wait">
                                {STEPS.map(
                                    (s, i) =>
                                        step === i && (
                                            <motion.div
                                                key={s.text}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
                                                transition={{ duration: 0.6 }}
                                                className="w-full h-full absolute inset-0 flex items-center justify-center"
                                            >
                                                <HandwritingSvg text={s.text} duration={s.duration} />
                                            </motion.div>
                                        )
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {isSequenceComplete && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-12 flex flex-col items-center gap-3 text-hexred/80 font-mono"
                            >
                                <span className="text-xs tracking-[0.3em] uppercase opacity-80">
                                    Scroll to Explore
                                </span>
                                <motion.div
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                                >
                                    <ChevronDown size={28} className="drop-shadow-[0_0_8px_rgba(234,40,69,0.8)]" />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            <motion.div
                style={{
                    opacity: isSequenceComplete ? contentOpacity : 0,
                    y: isSequenceComplete ? contentY : 0,
                }}
            >
                {children}
            </motion.div>
        </div>
    )
}
