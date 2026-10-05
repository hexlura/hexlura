'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const QrScanner = dynamic(() => import('@/components/organiser/QrScanner').then(m => m.QrScanner), { ssr: false })

interface CheckinResult {
    success: boolean
    message: string
    code: string
    data?: {
        attendee_name: string
        ticket_type: string
        event_name: string
        checked_in_at: string
    }
}

interface BookingItemRow {
    id: string
    ticket_type: string
    attendee_name: string | null
    quantity: number
    scanned_count: number
    checked_in: boolean
    checked_in_at?: string
}

interface ScanLogEntry {
    id: string
    name: string
    ticketType: string
    time: string
    success: boolean
    message: string
}

interface CheckinClientProps {
    eventId: string
    eventTitle: string
    eventDate: string
    totalTickets: number
    initialCheckedIn: number
}

type ResultStyle = { bg: string; icon: 'tick' | 'cross' | 'warn'; title: string }

// Full-colour result screens so a scan can be read at arm's length in a dark venue.
const RESULT_STYLES: Record<string, ResultStyle> = {
    SUCCESS:          { bg: 'bg-warm-green', icon: 'tick',  title: 'CHECKED IN' },
    ALREADY_SCANNED:  { bg: 'bg-warm-red',   icon: 'cross', title: 'ALREADY CHECKED IN' },
    WRONG_EVENT:      { bg: 'bg-warm-red',   icon: 'cross', title: 'WRONG EVENT' },
    TOO_EARLY:        { bg: 'bg-warm-amber', icon: 'warn',  title: 'TOO EARLY' },
    EVENT_ENDED:      { bg: 'bg-warm-red',   icon: 'cross', title: 'EVENT ENDED' },
    CANCELLED:        { bg: 'bg-warm-red',   icon: 'cross', title: 'EVENT CANCELLED' },
    CANCELLED_TICKET: { bg: 'bg-warm-red',   icon: 'cross', title: 'TICKET CANCELLED' },
    INVALID:          { bg: 'bg-warm-red',   icon: 'cross', title: 'INVALID TICKET' },
}

const RESULT_ICONS: Record<ResultStyle['icon'], string> = {
    tick: 'm5 12 5 5L20 7',
    cross: 'M18 6 6 18M6 6l12 12',
    warn: 'M12 8v5M12 17h.01',
}

function formatTime(date: Date) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function CheckinClient({ eventId, eventTitle, eventDate, totalTickets, initialCheckedIn }: CheckinClientProps) {
    const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
    const [result, setResult] = useState<CheckinResult | null>(null)
    const [manualRef, setManualRef] = useState('')
    const [lookingUp, setLookingUp] = useState(false)
    const [bookingItems, setBookingItems] = useState<BookingItemRow[] | null>(null)
    const [lookupRef, setLookupRef] = useState('')
    const [checkingItemId, setCheckingItemId] = useState<string | null>(null)
    const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
    const processing = useRef(false)

    async function processCheckin(payload: { qr_token?: string; booking_ref?: string; booking_item_id?: string }) {
        if (processing.current) return
        processing.current = true
        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, event_id: eventId }),
            })
            const data: CheckinResult = await res.json()
            setResult(data)
            if (data.success) setCheckedIn(c => c + 1)

            // Add to scan log
            setScanLog(prev => [{
                id: Date.now().toString(),
                name: data.data?.attendee_name || '',
                ticketType: data.data?.ticket_type || '',
                time: formatTime(new Date()),
                success: data.success,
                message: data.message,
            }, ...prev].slice(0, 50))

            setTimeout(() => {
                setResult(null)
                processing.current = false
            }, 3000)
            return data
        } catch {
            processing.current = false
            return null
        }
    }

    const handleScan = useCallback((value: string) => {
        processCheckin({ qr_token: value })
    }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleManualLookup() {
        const ref = manualRef.trim().toUpperCase()
        if (!ref) return
        setLookingUp(true)
        setBookingItems(null)

        const res = await fetch(`/api/checkin/lookup?booking_ref=${encodeURIComponent(ref)}&event_id=${encodeURIComponent(eventId)}`)
        const data = await res.json()
        setLookingUp(false)

        if (!res.ok || !data.items) {
            setResult({ success: false, message: data.error || 'Booking not found', code: data.code || 'INVALID' })
            setTimeout(() => { setResult(null); processing.current = false }, 3000)
            setManualRef('')
            return
        }

        // Always show the list so door staff has explicit control
        setLookupRef(ref)
        setBookingItems(data.items)
        setManualRef('')
    }

    async function handleItemCheckin(item: BookingItemRow) {
        setCheckingItemId(item.id)
        const res = await processCheckin({ booking_item_id: item.id })
        setCheckingItemId(null)
        if (res?.success) {
            setBookingItems(prev => prev
                ? prev.map(i => {
                    if (i.id !== item.id) return i
                    const newCount = i.scanned_count + 1
                    return { ...i, scanned_count: newCount, checked_in: newCount >= i.quantity }
                })
                : prev
            )
        }
    }

    const cardStyle = result ? (RESULT_STYLES[result.code] ?? RESULT_STYLES.INVALID) : null

    return (
        <div className="warm-theme min-h-screen">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <header className="bg-card border-b border-border px-5 py-4 flex items-center justify-between">
                    <div className="min-w-0">
                        <Link href="/checkin" className="text-xs font-semibold text-muted flex items-center gap-1 mb-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                            Events
                        </Link>
                        <h1 className="font-heading text-2xl tracking-wide truncate">{eventTitle}</h1>
                        <p className="text-xs text-muted">{eventDate} · Check-in</p>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                        <p className="font-heading text-4xl leading-none">{checkedIn}</p>
                        <p className="text-xs text-muted">of {totalTickets} in</p>
                    </div>
                </header>

                {/* Progress bar */}
                <div className="h-1.5 bg-border">
                    <div
                        className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-r-full transition-all duration-300"
                        style={{ width: `${totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0}%` }}
                    />
                </div>

                <main className="px-5 py-5">
                    {/* Camera */}
                    <div className="relative rounded-3xl overflow-hidden bg-text shadow-card">
                        <QrScanner onScan={handleScan} />
                    </div>
                    <p className="text-xs font-semibold text-muted text-center mt-3">Point camera at attendee QR code</p>

                    {/* Manual lookup */}
                    <div className="bg-card rounded-2xl border border-border shadow-soft p-4 mt-4">
                        <p className="text-xs font-semibold text-muted mb-2">Or enter booking ref</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualRef}
                                onChange={e => setManualRef(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                                placeholder="HXL-XXXXXX"
                                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-background border border-border text-base font-mono uppercase placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                            />
                            <button
                                onClick={handleManualLookup}
                                disabled={lookingUp || !manualRef}
                                className="px-5 rounded-xl bg-text text-white text-sm font-semibold disabled:opacity-50 transition"
                            >
                                {lookingUp ? '...' : 'Search'}
                            </button>
                        </div>
                    </div>

                    {/* Multi-ticket booking panel */}
                    {bookingItems && (
                        <div className="bg-card rounded-2xl border border-border shadow-soft mt-4 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <p className="text-sm font-bold">
                                    <span className="font-mono text-accent">{lookupRef}</span> — {bookingItems.length} ticket{bookingItems.length !== 1 ? 's' : ''}
                                </p>
                                <button
                                    onClick={() => { setBookingItems(null); setLookupRef('') }}
                                    className="text-xs font-semibold text-muted hover:text-text transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="divide-y divide-border">
                                {bookingItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {item.ticket_type}
                                                {item.quantity > 1 && (
                                                    <span className="ml-1.5 text-xs font-normal text-muted">x{item.quantity}</span>
                                                )}
                                            </p>
                                            {item.attendee_name && (
                                                <p className="text-xs text-muted truncate">{item.attendee_name}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {item.checked_in ? (
                                                <span className="text-xs font-bold text-warm-green bg-warm-green/10 px-3 py-1.5 rounded-full">
                                                    {item.quantity > 1 ? `All ${item.quantity} in` : `In${item.checked_in_at ? ` · ${item.checked_in_at}` : ''}`}
                                                </span>
                                            ) : (
                                                <>
                                                    {item.quantity > 1 && item.scanned_count > 0 && (
                                                        <span className="text-xs font-bold text-warm-amberText bg-warm-amber/15 px-2.5 py-1.5 rounded-full">
                                                            {item.scanned_count}/{item.quantity} in
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleItemCheckin(item)}
                                                        disabled={checkingItemId === item.id}
                                                        className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-white shadow-glow disabled:opacity-50 disabled:shadow-none transition"
                                                    >
                                                        {checkingItemId === item.id ? '...' : 'Check in'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scan history log */}
                    {scanLog.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border shadow-soft mt-4 overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                                    Recent scans ({scanLog.length})
                                </p>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto divide-y divide-border">
                                {scanLog.map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.success ? 'bg-warm-green' : 'bg-accent'}`} />
                                        <p className={`flex-1 min-w-0 truncate text-sm ${entry.success ? '' : 'font-semibold text-accent'}`}>
                                            {entry.success
                                                ? `${entry.name}${entry.ticketType ? ` — ${entry.ticketType}` : ''}`
                                                : entry.message}
                                        </p>
                                        <span className="text-xs text-muted shrink-0">{entry.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Link href={`/organiser/events/${eventId}/attendees`} className="block text-center text-xs font-semibold text-muted hover:text-accent transition-colors mt-5">
                        View all attendees
                    </Link>
                </main>
            </div>

            {/* Result overlay */}
            {result && cardStyle && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5">
                    <div className={`w-full max-w-sm rounded-3xl p-8 text-center text-white shadow-hover ${cardStyle.bg}`}>
                        <div className="w-20 h-20 mx-auto rounded-full bg-white/25 flex items-center justify-center mb-4">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d={RESULT_ICONS[cardStyle.icon]} />
                            </svg>
                        </div>
                        <h2 className="font-heading text-4xl tracking-wider mb-2">{cardStyle.title}</h2>
                        <p className="text-base font-medium">{result.message}</p>
                        {result.success && result.data && (
                            <div className="border-t border-white/30 mt-5 pt-4 text-sm space-y-0.5">
                                <p className="font-bold text-lg">{result.data.attendee_name}</p>
                                <p>{result.data.ticket_type}</p>
                                <p>{result.data.checked_in_at}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
