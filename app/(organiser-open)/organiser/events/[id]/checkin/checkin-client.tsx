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
    checked_in: boolean
    checked_in_at?: string
}

interface CheckinClientProps {
    eventId: string
    eventTitle: string
    eventDate: string
    totalTickets: number
    initialCheckedIn: number
}

const RESULT_STYLES: Record<string, { bg: string; border: string; color: string; icon: string; title: string }> = {
    SUCCESS:          { bg: 'rgba(0,229,160,0.1)',  border: '#00E5A0', color: '#00E5A0', icon: '✓', title: 'CHECK IN SUCCESSFUL' },
    ALREADY_SCANNED:  { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'ALREADY CHECKED IN' },
    WRONG_EVENT:      { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'WRONG EVENT' },
    TOO_EARLY:        { bg: 'rgba(245,166,35,0.1)', border: '#F5A623', color: '#F5A623', icon: '⚠', title: 'TOO EARLY' },
    EVENT_ENDED:      { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'EVENT ENDED' },
    CANCELLED:        { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'EVENT CANCELLED' },
    CANCELLED_TICKET: { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'TICKET CANCELLED' },
    INVALID:          { bg: 'rgba(230,57,80,0.1)',  border: '#E63950', color: '#E63950', icon: '✗', title: 'INVALID TICKET' },
}

export function CheckinClient({ eventId, eventTitle, eventDate, totalTickets, initialCheckedIn }: CheckinClientProps) {
    const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
    const [result, setResult] = useState<CheckinResult | null>(null)
    const [manualRef, setManualRef] = useState('')
    const [lookingUp, setLookingUp] = useState(false)
    const [bookingItems, setBookingItems] = useState<BookingItemRow[] | null>(null)
    const [lookupRef, setLookupRef] = useState('')
    const [checkingItemId, setCheckingItemId] = useState<string | null>(null)
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
            // Show error via the result overlay
            setResult({ success: false, message: data.error || 'Booking not found', code: data.code || 'INVALID' })
            setTimeout(() => { setResult(null); processing.current = false }, 3000)
            setManualRef('')
            return
        }

        if (data.items.length === 1) {
            // Single ticket — check in immediately
            setManualRef('')
            await processCheckin({ booking_item_id: data.items[0].id })
        } else {
            // Multiple tickets — show list
            setLookupRef(ref)
            setBookingItems(data.items)
            setManualRef('')
        }
    }

    async function handleItemCheckin(item: BookingItemRow) {
        setCheckingItemId(item.id)
        const res = await processCheckin({ booking_item_id: item.id })
        setCheckingItemId(null)
        if (res?.success) {
            setBookingItems(prev => prev
                ? prev.map(i => i.id === item.id ? { ...i, checked_in: true } : i)
                : prev
            )
        }
    }

    const cardStyle = result ? (RESULT_STYLES[result.code] ?? RESULT_STYLES.INVALID) : null

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-lg text-text tracking-wide">{eventTitle}</h1>
                    <p className="text-xs text-muted">{eventDate} · Check-in</p>
                </div>
                <div className="text-right">
                    <p className="font-heading text-2xl text-text">{checkedIn}</p>
                    <p className="text-xs text-muted">of {totalTickets} checked in</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-border">
                <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0}%` }}
                />
            </div>

            {/* Scanner */}
            <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-sm mx-auto w-full">
                <div className="w-full bg-surface border border-border rounded-none overflow-hidden mb-4">
                    <QrScanner onScan={handleScan} />
                </div>
                <p className="text-xs text-muted text-center mb-6">Point camera at attendee QR code</p>

                {/* Manual lookup */}
                <div className="w-full bg-card border border-border rounded-none p-4">
                    <p className="text-xs text-muted mb-2">Enter booking ref manually</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualRef}
                            onChange={e => setManualRef(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                            placeholder="HXL-XXXXXX"
                            className="flex-1 bg-surface border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent uppercase"
                        />
                        <button
                            onClick={handleManualLookup}
                            disabled={lookingUp || !manualRef}
                            className="px-4 py-2.5 bg-[#0A0A0F] text-white text-sm rounded-sm disabled:opacity-50 hover:bg-[#2a2a3f] transition-colors"
                        >
                            {lookingUp ? '...' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* Multi-ticket booking panel */}
                {bookingItems && (
                    <div className="w-full mt-4 bg-card border border-border rounded-none">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-text">
                                {lookupRef} — {bookingItems.length} ticket{bookingItems.length !== 1 ? 's' : ''}
                            </p>
                            <button
                                onClick={() => { setBookingItems(null); setLookupRef('') }}
                                className="text-xs text-muted hover:text-text transition-colors"
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {bookingItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-text font-medium truncate">{item.ticket_type}</p>
                                        {item.attendee_name && (
                                            <p className="text-xs text-muted truncate">{item.attendee_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.checked_in ? (
                                            <span className="text-xs font-semibold px-2 py-1 rounded-sm" style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}>
                                                ✓ In {item.checked_in_at ? `· ${item.checked_in_at}` : ''}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleItemCheckin(item)}
                                                disabled={checkingItemId === item.id}
                                                className="text-xs font-semibold px-3 py-1.5 bg-accent text-white rounded-sm disabled:opacity-50 transition-opacity"
                                                style={{ background: '#E63950' }}
                                            >
                                                {checkingItemId === item.id ? '...' : 'Check In'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Link href={`/organiser/events/${eventId}/attendees`} className="mt-4 text-xs text-muted hover:text-accent transition-colors">
                    ← View all attendees
                </Link>
            </div>

            {/* Result overlay */}
            {result && cardStyle && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                    <div
                        style={{
                            background: cardStyle.bg,
                            border: `1px solid ${cardStyle.border}`,
                            color: cardStyle.color,
                        }}
                        className="w-full max-w-sm rounded-none p-8 text-center"
                    >
                        <div className="text-6xl mb-4">{cardStyle.icon}</div>
                        <h2 className="font-heading text-2xl tracking-widest mb-3">{cardStyle.title}</h2>
                        <p className="text-base mb-4">{result.message}</p>
                        {result.success && result.data && (
                            <div className="text-sm space-y-1 opacity-80 border-t pt-4 mt-2" style={{ borderColor: cardStyle.border }}>
                                <p className="font-semibold">{result.data.attendee_name}</p>
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
