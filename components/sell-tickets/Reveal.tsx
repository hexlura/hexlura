'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './selling.module.css'

export function useInView<T extends HTMLElement>(threshold = 0.15) {
    const ref = useRef<T | null>(null)
    const [active, setActive] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActive(true)
                        io.unobserve(entry.target)
                    }
                })
            },
            { threshold, rootMargin: '0px 0px -60px 0px' }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [threshold])

    return { ref, active }
}

export function Reveal({
    children,
    className = '',
    scale = false,
    delayMs = 0,
    as: Tag = 'div',
}: {
    children: React.ReactNode
    className?: string
    scale?: boolean
    delayMs?: number
    as?: React.ElementType
}) {
    const { ref, active } = useInView<HTMLElement>()
    return (
        <Tag
            ref={ref}
            className={`${scale ? styles.revealScale : styles.reveal} ${active ? styles.active : ''} ${className}`}
            style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
        >
            {children}
        </Tag>
    )
}
