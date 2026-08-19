'use client'

import { useEffect, useRef } from 'react'

type Particle = {
    x: number
    y: number
    r: number
    speedY: number
    driftX: number
    phase: number
    opacity: number
}

/**
 * Reusable ambient background: soft red particles drifting down against dark.
 * Motif lifted from the boardroom brand photography (Hexlura_desk_poster.png).
 * Canvas-based so it stays cheap even with 60+ particles on screen at once.
 */
export default function AmbientParticles({
    density = 46,
    className = '',
}: {
    density?: number
    className?: string
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        let width = 0
        let height = 0
        let dpr = Math.min(window.devicePixelRatio || 1, 2)
        let particles: Particle[] = []
        let raf = 0

        function makeParticle(randomY: boolean): Particle {
            return {
                x: Math.random() * width,
                y: randomY ? Math.random() * height : -20,
                r: 1 + Math.random() * 2.6,
                speedY: 6 + Math.random() * 14,
                driftX: (Math.random() - 0.5) * 10,
                phase: Math.random() * Math.PI * 2,
                opacity: 0.15 + Math.random() * 0.35,
            }
        }

        function resize() {
            const rect = canvas!.getBoundingClientRect()
            width = rect.width
            height = rect.height
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas!.width = width * dpr
            canvas!.height = height * dpr
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
            particles = Array.from({ length: density }, () => makeParticle(true))
        }

        resize()
        window.addEventListener('resize', resize)

        if (reduceMotion) {
            // Static frame: draw once, no rAF loop.
            ctx.clearRect(0, 0, width, height)
            particles.forEach((p) => {
                ctx.beginPath()
                ctx.fillStyle = `rgba(234, 40, 69, ${p.opacity})`
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fill()
            })
            return () => window.removeEventListener('resize', resize)
        }

        let last = performance.now()
        function frame(now: number) {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            ctx!.clearRect(0, 0, width, height)
            particles.forEach((p) => {
                p.y += p.speedY * dt
                p.phase += dt
                const x = p.x + Math.sin(p.phase) * p.driftX * dt * 6
                ctx!.beginPath()
                ctx!.fillStyle = `rgba(234, 40, 69, ${p.opacity})`
                ctx!.arc(x, p.y, p.r, 0, Math.PI * 2)
                ctx!.fill()
                p.x = x
                if (p.y > height + 20) Object.assign(p, makeParticle(false))
            })
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(raf)
        }
    }, [density])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        />
    )
}
