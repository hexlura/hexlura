'use client'

import { useEffect, useState } from 'react'
import { motion, type Easing } from 'framer-motion'
import { cn } from '@/lib/utils'

const DEFAULT_FONT_URL = '/assets/fonts/Caveat-Regular.ttf'

// Module-level cache so repeated mounts (e.g. step changes) don't re-fetch/re-parse the font.
let fontPromise: Promise<import('opentype.js').Font> | null = null

function loadFont(url: string) {
    if (!fontPromise) {
        fontPromise = import('opentype.js').then(({ parse }) =>
            fetch(url)
                .then((res) => res.arrayBuffer())
                .then((buffer) => parse(buffer))
        )
    }
    return fontPromise
}

interface HandwritingSvgProps {
    text: string
    fontUrl?: string
    className?: string
    strokeClassName?: string
    duration?: number
    delay?: number
    strokeWidth?: number
    fontSize?: number
    ease?: Easing
}

export function HandwritingSvg({
    text,
    fontUrl = DEFAULT_FONT_URL,
    className,
    strokeClassName,
    duration = 2.5,
    delay = 0,
    strokeWidth = 2,
    fontSize = 120,
    ease = 'easeInOut',
}: HandwritingSvgProps) {
    const [path, setPath] = useState<string | null>(null)
    const [viewBox, setViewBox] = useState('0 0 800 300')

    useEffect(() => {
        let cancelled = false
        setPath(null)

        loadFont(fontUrl)
            .then((font) => {
                if (cancelled) return
                const p = font.getPath(text, 0, fontSize, fontSize, { kerning: false })
                const bbox = p.getBoundingBox()
                const pad = 15
                const vx = Math.floor(bbox.x1) - pad
                const vy = Math.floor(bbox.y1) - pad
                const vw = Math.ceil(bbox.x2 - bbox.x1) + pad * 2
                const vh = Math.ceil(bbox.y2 - bbox.y1) + pad * 2

                setViewBox(`${vx} ${vy} ${vw} ${vh}`)
                setPath(p.toPathData(2))
            })
            .catch((err) => {
                console.error('Failed to load handwriting font:', err)
            })

        return () => {
            cancelled = true
        }
    }, [text, fontUrl, fontSize])

    // Reserve the layout space even before the path is ready, so the intro
    // sequence never shifts other elements while the font is loading.
    if (!path) {
        return <div className={cn('w-full h-full', className)} aria-hidden />
    }

    return (
        <svg
            viewBox={viewBox}
            className={cn('w-full h-full max-w-full max-h-full', className)}
            aria-hidden
        >
            <defs>
                <filter id="handwritingGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur1" />
                    <feGaussianBlur stdDeviation="8" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background glow stroke */}
            <motion.path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#handwritingGlow)"
                className={cn('opacity-80', strokeClassName)}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay, duration, ease }}
            />

            {/* Crisp foreground stroke */}
            <motion.path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth * 0.35}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-95"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay, duration, ease }}
            />
        </svg>
    )
}
