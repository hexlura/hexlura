'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { whatsAppLink } from '@/lib/whatsapp-shared'

// Floating "chat on WhatsApp" button. Click opens the chat; press-and-drag moves it anywhere on screen
// (it remembers where the visitor left it) so it never has to cover something they need.

const SIZE = 56
const MARGIN = 8
const DRAG_THRESHOLD = 6 // px of movement before a press counts as a drag instead of a click
const STORAGE_KEY = 'hexlura_whatsapp_pos'

// Pages where a floating button would get in the way of real work.
function hiddenOn(pathname: string): boolean {
    return (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/checkin') ||
        pathname.startsWith('/maintenance') ||
        /^\/organiser\/events\/(new|[^/]+\/edit)(\/|$)/.test(pathname) // the event form has its own sticky Save bar
    )
}

interface Frac { fx: number; fy: number }

export function WhatsAppFloat({ number, message }: { number: string; message: string }) {
    const pathname = usePathname()
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
    const frac = useRef<Frac>({ fx: 1, fy: 1 })
    const drag = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null)
    const justDragged = useRef(false)
    // The true current position. React state can lag a frame behind the pointer, and a quick flick releases the
    // pointer in that gap — saving from stale state would remember the position BEFORE the drag.
    const live = useRef<{ x: number; y: number } | null>(null)
    const place = useCallback((p: { x: number; y: number }) => { live.current = p; setPos(p) }, [])

    const toPx = useCallback((f: Frac) => {
        const w = Math.max(0, window.innerWidth - SIZE - MARGIN * 2)
        const h = Math.max(0, window.innerHeight - SIZE - MARGIN * 2)
        return { x: MARGIN + f.fx * w, y: MARGIN + f.fy * h }
    }, [])

    const toFrac = useCallback((x: number, y: number): Frac => {
        const w = Math.max(1, window.innerWidth - SIZE - MARGIN * 2)
        const h = Math.max(1, window.innerHeight - SIZE - MARGIN * 2)
        return { fx: Math.min(1, Math.max(0, (x - MARGIN) / w)), fy: Math.min(1, Math.max(0, (y - MARGIN) / h)) }
    }, [])

    // Start where the visitor last left it, otherwise bottom-right (above the phone menu bar).
    useEffect(() => {
        let start: Frac | null = null
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const p = JSON.parse(raw)
                if (typeof p?.fx === 'number' && typeof p?.fy === 'number') start = { fx: Math.min(1, Math.max(0, p.fx)), fy: Math.min(1, Math.max(0, p.fy)) }
            }
        } catch {
            // Storage blocked/corrupt: just use the default position — remembering it is a nicety, not required.
        }
        if (!start) {
            const bottomGap = window.innerWidth < 768 ? 88 : 24
            start = toFrac(window.innerWidth - SIZE - 16, window.innerHeight - SIZE - bottomGap)
        }
        frac.current = start
        place(toPx(start))

        const onResize = () => place(toPx(frac.current))
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [toPx, toFrac, place])

    if (!pos || hiddenOn(pathname || '')) return null

    function onPointerDown(e: React.PointerEvent<HTMLAnchorElement>) {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        // Capture keeps the drag smooth if the finger/cursor outruns the icon; if the browser refuses, dragging still works.
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* optional nicety */ }
        const origin = live.current ?? pos!
        drag.current = { startX: e.clientX, startY: e.clientY, originX: origin.x, originY: origin.y, moved: false }
    }

    function onPointerMove(e: React.PointerEvent<HTMLAnchorElement>) {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        d.moved = true
        const x = Math.min(window.innerWidth - SIZE - MARGIN, Math.max(MARGIN, d.originX + dx))
        const y = Math.min(window.innerHeight - SIZE - MARGIN, Math.max(MARGIN, d.originY + dy))
        place({ x, y })
    }

    function endDrag(e: React.PointerEvent<HTMLAnchorElement>) {
        const d = drag.current
        drag.current = null
        try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* nothing to release */ }
        if (d?.moved) {
            // The browser still fires a click after a drag — swallow it so dragging doesn't open WhatsApp.
            justDragged.current = true
            window.setTimeout(() => { justDragged.current = false }, 100)
            const p = live.current ?? pos!
            frac.current = toFrac(p.x, p.y)
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(frac.current))
            } catch {
                // Storage blocked: the icon still works, it just won't remember its place next visit.
            }
        }
    }

    return (
        <a
            href={whatsAppLink(number, message)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Hexlura on WhatsApp"
            title="Chat on WhatsApp — drag to move"
            draggable={false}
            onDragStart={e => e.preventDefault()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={e => { if (justDragged.current) e.preventDefault() }}
            className="fixed z-[45] flex items-center justify-center rounded-full text-white shadow-[0_8px_24px_-6px_rgba(37,211,102,0.65)] ring-4 ring-white/80 hover:scale-105 active:scale-95 transition-transform select-none"
            style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE, backgroundColor: '#25D366', touchAction: 'none', cursor: 'grab' }}
        >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
        </a>
    )
}
