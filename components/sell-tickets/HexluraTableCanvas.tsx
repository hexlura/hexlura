'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// ─── Frame sequence config ──────────────────────────────────────────────────
// Frames live in public/assets/images/Heclura_Desk_Frames_v2/, 1-based &
// zero-padded to 3 digits (frame_001.jpg ... frame_120.jpg). Opaque JPEGs
// converted from the original 240 RGBA PNGs via scripts/convert-sponsor-frames.sh
// (alpha dropped — canvas always paints an opaque background first — and every
// other source frame kept, since 120 frames over a 400vh scrub reads as smooth
// as 240 while cutting the network payload roughly 30x).
const FRAME_COUNT = 120
const NATIVE_WIDTH = 1280
const NATIVE_HEIGHT = 720
// Content reveals once the scrub reaches the last third of frames.
const REVEAL_FRAME_START = FRAME_COUNT - 40
// Frames loaded eagerly/with priority before the stage is marked ready.
const PRIORITY_WINDOW = 20
// Max simultaneous in-flight requests once background-filling the rest.
const BACKGROUND_CONCURRENCY = 5

function framePath(index: number) {
    return `/assets/images/Heclura_Desk_Frames_v2/frame_${String(index).padStart(3, '0')}.jpg`
}

export default function HexluraTableCanvas() {
    const stageRef = useRef<HTMLDivElement>(null)
    const pinRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const framesRef = useRef<HTMLImageElement[]>([])
    const currentIndexRef = useRef(-1)

    const [loadProgress, setLoadProgress] = useState(0)
    const [ready, setReady] = useState(false)
    const [revealed, setRevealed] = useState(false)
    const [reduceMotion, setReduceMotion] = useState(false)

    const { scrollYProgress } = useScroll({
        target: stageRef,
        offset: ['start start', 'end end'],
    })

    const revealStart = REVEAL_FRAME_START / (FRAME_COUNT - 1)
    const contentOpacity = useTransform(scrollYProgress, [revealStart, 1], [0, 1])
    const contentY = useTransform(scrollYProgress, [revealStart, 1], [24, 0])

    function isLoaded(index: number) {
        const img = framesRef.current[index]
        return !!img && img.complete && img.naturalWidth > 0
    }

    // Finds the nearest frame to `index` that has actually finished loading,
    // so a fast scrub into an unloaded region draws the closest available
    // frame instead of freezing on whatever was drawn last.
    function nearestLoaded(index: number) {
        if (isLoaded(index)) return index
        for (let d = 1; d < FRAME_COUNT; d++) {
            const lo = index - d
            const hi = index + d
            if (lo >= 0 && isLoaded(lo)) return lo
            if (hi < FRAME_COUNT && isLoaded(hi)) return hi
        }
        return -1
    }

    function drawFrame(index: number, force = false) {
        const canvas = canvasRef.current
        const pin = pinRef.current
        if (!canvas || !pin) return

        const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, index))
        if (!force && clamped === currentIndexRef.current) return
        currentIndexRef.current = clamped

        const drawIndex = nearestLoaded(clamped)
        if (drawIndex === -1) return
        const img = framesRef.current[drawIndex]

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        const rect = pin.getBoundingClientRect()
        const cw = rect.width
        const ch = rect.height
        const imgRatio = NATIVE_WIDTH / NATIVE_HEIGHT
        const canvasRatio = cw / ch

        // "Cover" fit: fills the canvas, crops overflow, stays centered.
        let drawW: number, drawH: number, offsetX: number, offsetY: number
        if (canvasRatio > imgRatio) {
            drawW = cw
            drawH = cw / imgRatio
            offsetX = 0
            offsetY = (ch - drawH) / 2
        } else {
            drawH = ch
            drawW = ch * imgRatio
            offsetX = (cw - drawW) / 2
            offsetY = 0
        }

        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, 0, cw, ch)
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
    }

    function resizeCanvas() {
        const canvas = canvasRef.current
        const pin = pinRef.current
        if (!canvas || !pin) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const rect = pin.getBoundingClientRect()
        const w = Math.round(rect.width)
        const h = Math.round(rect.height)

        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`

        const ctx = canvas.getContext('2d', { alpha: false })
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

        drawFrame(currentIndexRef.current === -1 ? 0 : currentIndexRef.current, true)
    }

    // Respect reduced motion: skip the scrub, land on the final frame with content shown.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReduceMotion(mq.matches)
        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // Preload the frame sequence once the stage nears the viewport (skip
    // spending bandwidth on it if the user never scrolls this far). A small
    // priority window loads first — as soon as it lands the stage is marked
    // ready, so the loader doesn't block on the full sequence. The remainder
    // background-fills through a limited-concurrency queue that always grabs
    // whichever pending frame is nearest to the current scrub position.
    useEffect(() => {
        const stage = stageRef.current
        if (!stage) return

        let cancelled = false

        function startLoading() {
            resizeCanvas()

            const reduceMotionNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            const windowSize = Math.min(PRIORITY_WINDOW, FRAME_COUNT)
            const priorityIndices = reduceMotionNow
                ? Array.from({ length: windowSize }, (_, i) => FRAME_COUNT - 1 - i)
                : Array.from({ length: windowSize }, (_, i) => i)
            const prioritySet = new Set(priorityIndices)
            const pending = new Set<number>()
            for (let i = 0; i < FRAME_COUNT; i++) {
                if (!prioritySet.has(i)) pending.add(i)
            }

            let settledTotal = 0
            let prioritySettled = 0
            let inFlight = 0

            function pumpQueue() {
                while (inFlight < BACKGROUND_CONCURRENCY && pending.size > 0) {
                    let best = -1
                    let bestDist = Infinity
                    pending.forEach((idx) => {
                        const dist = Math.abs(idx - currentIndexRef.current)
                        if (dist < bestDist) {
                            bestDist = dist
                            best = idx
                        }
                    })
                    if (best === -1) break
                    pending.delete(best)
                    inFlight += 1
                    loadFrame(best, false)
                }
            }

            function loadFrame(index: number, isPriority: boolean) {
                const img = new Image()
                img.decoding = 'async'
                const onSettle = () => {
                    if (cancelled) return
                    settledTotal += 1
                    setLoadProgress(Math.round((settledTotal / FRAME_COUNT) * 100))
                    if (isPriority) {
                        prioritySettled += 1
                        if (prioritySettled === 1) {
                            resizeCanvas()
                            drawFrame(reduceMotionNow ? FRAME_COUNT - 1 : 0, true)
                        }
                        if (prioritySettled >= windowSize) {
                            setReady(true)
                            pumpQueue()
                        }
                    } else {
                        inFlight -= 1
                        pumpQueue()
                    }
                }
                img.onload = onSettle
                img.onerror = onSettle // don't let one missing frame stall the whole sequence
                img.src = framePath(index + 1)
                framesRef.current[index] = img
            }

            priorityIndices.forEach((idx) => loadFrame(idx, true))
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    startLoading()
                    observer.disconnect()
                }
            },
            { rootMargin: '1200px 0px' }
        )
        observer.observe(stage)

        const onResize = () => resizeCanvas()
        window.addEventListener('resize', onResize)

        return () => {
            cancelled = true
            observer.disconnect()
            window.removeEventListener('resize', onResize)
        }
    }, [])

    useEffect(() => {
        if (!ready) return
        if (reduceMotion) {
            drawFrame(FRAME_COUNT - 1, true)
            setRevealed(true)
        }
    }, [ready, reduceMotion])

    useMotionValueEvent(scrollYProgress, 'change', (progress) => {
        if (!ready || reduceMotion) return
        drawFrame(Math.round(progress * (FRAME_COUNT - 1)))
    })

    useMotionValueEvent(contentOpacity, 'change', (value) => {
        setRevealed(value > 0.05)
    })

    const handleScrollDown = () => {
        const hero = document.getElementById('hero-section')
        if (hero) {
            window.scrollTo({
                top: hero.offsetTop + hero.offsetHeight,
                behavior: 'smooth',
            })
        } else {
            const nextSection = document.getElementById('why-hexlura')
            if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' })
            } else {
                window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
            }
        }
    }

    return (
        <section
            ref={stageRef}
            className="relative hidden md:block bg-[#0a0a0a]"
            style={{ height: reduceMotion ? '100dvh' : '400vh' }}
        >
            <div
                ref={pinRef}
                className="w-full h-[100dvh] overflow-hidden bg-[#0a0a0a]"
                style={{ position: reduceMotion ? 'relative' : 'sticky', top: 0 }}
            >
                <canvas ref={canvasRef} className="block w-full h-full" />

                {!ready && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a] transition-opacity duration-500"
                        aria-hidden="true"
                    >
                        <div className="h-[2px] w-[min(240px,60vw)] overflow-hidden rounded-full bg-white/[0.14]">
                            <div
                                className="h-full rounded-full bg-[#f5f5f5] transition-[width] duration-150 ease-out"
                                style={{ width: `${loadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-black/55" />

                {/* Reveals over the final frames of the scrub */}
                <motion.div
                    className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center ${revealed ? 'pointer-events-auto' : 'pointer-events-none'
                        }`}
                    style={reduceMotion ? undefined : { opacity: contentOpacity, y: contentY }}
                />

                <AnimatePresence>
                    <motion.button
                        type="button"
                        onClick={handleScrollDown}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-10 left-[45%] translate-x-1/2 z-20 flex flex-col items-center gap-2 text-hexred hover:text-white transition-colors font-mono cursor-pointer group focus:outline-none"
                        aria-label="Scroll to explore"
                    >
                        <span className="text-xs tracking-[0.3em] uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                            Scroll to Explore
                        </span>
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        >
                            <ChevronDown size={28} className="drop-shadow-[0_0_8px_rgba(234,40,69,0.8)]" />
                        </motion.div>
                    </motion.button>
                </AnimatePresence>
            </div>
        </section>
    )
}
