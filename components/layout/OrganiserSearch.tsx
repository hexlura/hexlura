'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface SearchResults {
    events: { id: string; title: string; start_at: string }[]
    bookings: { ref: string; eventTitle: string }[]
    attendees: { name: string; email: string; ref: string; eventTitle: string }[]
}

const EMPTY: SearchResults = { events: [], bookings: [], attendees: [] }

export function OrganiserSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>(EMPTY)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    // Debounced fetch; the abort controller discards stale responses
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) {
            setResults(EMPTY)
            setLoading(false)
            setFailed(false)
            return
        }
        const controller = new AbortController()
        setLoading(true)
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/organiser/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
                if (!res.ok) throw new Error(`search ${res.status}`)
                setResults(await res.json())
                setFailed(false)
            } catch (e) {
                if ((e as Error).name === 'AbortError') return
                console.error('[OrganiserSearch] failed:', e)
                setFailed(true)
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }, 250)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query])

    useEffect(() => {
        if (!open) return
        function onDown(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const close = () => setOpen(false)
    const total = results.events.length + results.bookings.length + results.attendees.length
    const showPanel = open && query.trim().length >= 2

    return (
        <div ref={wrapRef} className="relative w-72">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                maxLength={60}
                placeholder="Search events, bookings, attendees…"
                aria-label="Search events, bookings, attendees"
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
            />

            {showPanel && (
                <div className="absolute left-0 mt-2 w-[26rem] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-hover overflow-hidden z-40">
                    {loading && total === 0 ? (
                        <p className="text-xs text-muted text-center py-6">Searching…</p>
                    ) : failed ? (
                        <p className="text-xs text-warm-red text-center py-6">Search failed. Try again.</p>
                    ) : total === 0 ? (
                        <p className="text-xs text-muted text-center py-6">No results for &ldquo;{query.trim()}&rdquo;</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto divide-y divide-border">
                            {results.events.length > 0 && (
                                <div className="py-2">
                                    <p className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">Events</p>
                                    {results.events.map(e => (
                                        <Link key={e.id} href={`/organiser/events/${e.id}`} onClick={close} className="block px-4 py-2 hover:bg-background transition-colors">
                                            <p className="text-sm font-medium truncate">{e.title}</p>
                                            <p className="text-[11px] text-muted">
                                                {new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {results.bookings.length > 0 && (
                                <div className="py-2">
                                    <p className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">Bookings</p>
                                    {results.bookings.map(b => (
                                        <Link key={b.ref} href={`/organiser/bookings/${b.ref}`} onClick={close} className="block px-4 py-2 hover:bg-background transition-colors">
                                            <p className="text-sm font-medium font-mono">{b.ref}</p>
                                            <p className="text-[11px] text-muted truncate">{b.eventTitle}</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {results.attendees.length > 0 && (
                                <div className="py-2">
                                    <p className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">Attendees</p>
                                    {results.attendees.map(a => (
                                        <Link key={`${a.ref}-${a.email}-${a.name}`} href={`/organiser/bookings/${a.ref}`} onClick={close} className="block px-4 py-2 hover:bg-background transition-colors">
                                            <p className="text-sm font-medium truncate">{a.name}</p>
                                            <p className="text-[11px] text-muted truncate">
                                                {a.email ? `${a.email} · ` : ''}<span className="font-mono">{a.ref}</span> · {a.eventTitle}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
