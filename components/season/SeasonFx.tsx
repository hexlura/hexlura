'use client'

import { useEffect, useState } from 'react'
import type { SeasonConfig } from '@/lib/home-theme-config'

interface Particle {
    char: string
    style: React.CSSProperties
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// Page-wide falling / rising / floating particles. One fixed layer, so they stay on screen while
// the visitor scrolls. Generated after mount (Math.random would otherwise mismatch on hydration).
// Animation is disabled for prefers-reduced-motion in globals.css.
export function SeasonFx({ fx }: { fx: SeasonConfig['fx'] }) {
    const [items, setItems] = useState<Particle[]>([])

    useEffect(() => {
        // Fewer particles on phones — keeps it light.
        const count = window.matchMedia('(max-width: 640px)').matches ? Math.ceil(fx.count / 2) : fx.count
        const list: Particle[] = []
        for (let i = 0; i < count; i++) {
            const dur = fx.type === 'float' ? rnd(16, 28) : rnd(10, 22)
            const delay = -rnd(0, dur)
            const style: Record<string, string | number> = {
                fontSize: `${rnd(14, 30).toFixed(0)}px`,
                left: `${rnd(0, 100).toFixed(1)}%`,
                opacity: Number(rnd(0.35, 0.8).toFixed(2)),
                '--dx': `${rnd(-80, 80).toFixed(0)}px`,
                '--rot': `${rnd(-360, 360).toFixed(0)}deg`,
            }
            if (fx.type === 'fall') style.animation = `season-fall ${dur.toFixed(1)}s linear ${delay.toFixed(1)}s infinite`
            if (fx.type === 'rise') { style.top = '100%'; style.animation = `season-rise ${dur.toFixed(1)}s ease-out ${delay.toFixed(1)}s infinite` }
            if (fx.type === 'float') { style.top = `${rnd(8, 85).toFixed(0)}%`; style.left = 0; style.animation = `season-flit ${dur.toFixed(1)}s linear ${delay.toFixed(1)}s infinite` }
            list.push({ char: fx.items[i % fx.items.length], style: style as React.CSSProperties })
        }
        setItems(list)
    }, [fx])

    return (
        <div aria-hidden className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
            {items.map((p, i) => (
                <span key={i} className="season-fx-item" style={p.style}>{p.char}</span>
            ))}
        </div>
    )
}
