'use client'

import { useEffect, useRef } from 'react'

const WORDS = ['NEW.', 'WONDERFUL.', 'AWESOME.', 'HUGE.', 'BEAUTIFUL.', 'SMART.', 'SUPERB.', 'AMAZING.', 'WORTHWHILE.']

const HOLD_MS = 1210
const TRANSITION_MS = 390
const STEP_MS = HOLD_MS + TRANSITION_MS
const TRAVEL_EM = 1.35

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3)
}

function easeInCubic(t: number) {
    return t * t * t
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

export type KineticWordsDirection = 'up' | 'down' | 'random'

export default function KineticWords({
    className = '',
    direction = 'up',
}: {
    className?: string
    direction?: KineticWordsDirection
}) {
    const currentRef = useRef<HTMLSpanElement>(null)
    const nextRef = useRef<HTMLSpanElement>(null)
    const travelPxRef = useRef(92)
    const signRef = useRef(1)
    const lastIndexRef = useRef(-1)

    useEffect(() => {
        const currentEl = currentRef.current
        if (!currentEl) return

        const updateTravel = () => {
            const fontSize = parseFloat(getComputedStyle(currentEl).fontSize)
            travelPxRef.current = fontSize * TRAVEL_EM
        }
        updateTravel()
        window.addEventListener('resize', updateTravel)

        const startTime = performance.now()
        let rafId: number

        const render = (now: number) => {
            const elapsed = now - startTime
            const total = WORDS.length * STEP_MS
            const local = ((elapsed % total) + total) % total
            const index = Math.floor(local / STEP_MS)
            const stepTime = local - index * STEP_MS

            const current = WORDS[index]
            const next = WORDS[(index + 1) % WORDS.length]
            const travel = travelPxRef.current

            if (index !== lastIndexRef.current) {
                lastIndexRef.current = index
                signRef.current =
                    direction === 'up' ? 1 : direction === 'down' ? -1 : Math.random() < 0.5 ? 1 : -1
            }
            const sign = signRef.current

            const currentEl = currentRef.current
            const nextEl = nextRef.current
            if (currentEl && nextEl) {
                if (currentEl.textContent !== current) currentEl.textContent = current
                if (nextEl.textContent !== next) nextEl.textContent = next

                if (stepTime < HOLD_MS) {
                    currentEl.style.transform = 'translate(-50%, 0)'
                    currentEl.style.opacity = '1'
                    currentEl.style.filter = 'blur(0px)'
                    nextEl.style.opacity = '0'
                } else {
                    const t = clamp((stepTime - HOLD_MS) / TRANSITION_MS, 0, 1)

                    const outP = easeInCubic(t)
                    const outY = -sign * travel * outP
                    const outAlpha = 1 - clamp(t * 1.5, 0, 1)
                    const outBlur = 2.8 * t
                    currentEl.style.transform = `translate(-50%, ${outY}px)`
                    currentEl.style.opacity = String(outAlpha)
                    currentEl.style.filter = `blur(${outBlur}px)`

                    const inP = easeOutCubic(t)
                    const inY = sign * travel * (1 - inP)
                    const inAlpha = clamp((t - 0.1) / 0.72, 0, 1)
                    const inBlur = 3.2 * (1 - inP)
                    nextEl.style.transform = `translate(-50%, ${inY}px)`
                    nextEl.style.opacity = String(inAlpha)
                    nextEl.style.filter = `blur(${inBlur}px)`
                }
            }

            rafId = requestAnimationFrame(render)
        }

        rafId = requestAnimationFrame(render)
        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', updateTravel)
        }
    }, [direction])

    return (
        <span className={`relative inline-block align-top text-hexred ${className}`}>
            <span className="invisible">WONDERFUL.</span>
            <span
                ref={currentRef}
                className="absolute top-0 left-1/2"
                style={{ transform: 'translate(-50%, 0)', willChange: 'transform, opacity, filter' }}
            >
                {WORDS[0]}
            </span>
            <span
                ref={nextRef}
                className="absolute top-0 left-1/2 opacity-0"
                style={{ transform: 'translate(-50%, 0)', willChange: 'transform, opacity, filter' }}
            >
                {WORDS[1]}
            </span>
        </span>
    )
}
