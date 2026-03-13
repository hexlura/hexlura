'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const QrScanner = dynamic(() => import('@/components/organiser/QrScanner').then(m => m.QrScanner), { ssr: false })

interface CheckinResult {
    type: 'success' | 'already' | 'invalid' | 'wrong_event'
    name?: string
    ticketType?: string
    checkedInAt?: string
    eventTitle?: string
}

interface CheckinClientProps {
    eventId: string
    eventTitle: string
    eventDate: string
    totalTickets: number
    initialCheckedIn: number
}

export function CheckinClient({ eventId, eventTitle, eventDate, totalTickets, initialCheckedIn }: CheckinClientProps) {
    const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
    const [result, setResult] = useState<CheckinResult | null>(null)
    const [manualRef, setManualRef] = useState('')
    const [lookingUp, setLookingUp] = useState(false)
    const processing = useRef(false)

    async function processCheckin(payload: { qr_token?: string; booking_ref?: string }) {
        if (processing.current) return
        processing.current = true
        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, event_id: eventId }),
            })
            const data = await res.json()
            setResult(data)
            if (data.type === 'success') setCheckedIn(c => c + 1)
            setTimeout(() => {
                setResult(null)
                processing.current = false
            }, 3000)
        } catch {
            processing.current = false
        }
    }

    const handleScan = useCallback((value: string) => {
        processCheckin({ qr_token: value })
    }, [eventId])

    async function handleManualLookup() {
        if (!manualRef.trim()) return
        setLookingUp(true)
        await processCheckin({ booking_ref: manualRef.trim().toUpperCase() })
        setLookingUp(false)
        setManualRef('')
    }

    const resultConfig = result ? {
        success: { bg: 'bg-success', icon: '✓', title: 'CHECK IN SUCCESSFUL', body: `${result.name} · ${result.ticketType}` },
        already: { bg: 'bg-gold', icon: '⚠', title: 'ALREADY CHECKED IN', body: result.checkedInAt ? `Checked in at ${new Date(result.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '' },
        invalid: { bg: 'bg-accent', icon: '✗', title: 'INVALID TICKET', body: 'This ticket was not issued by Hexlura' },
        wrong_event: { bg: 'bg-accent', icon: '✗', title: 'WRONG EVENT', body: result.eventTitle ? `Belongs to: ${result.eventTitle}` : 'This ticket is for a different event' },
    }[result.type] : null

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
                <div className="w-full bg-surface border border-border rounded-xl overflow-hidden mb-4">
                    <QrScanner onScan={handleScan} />
                </div>
                <p className="text-xs text-muted text-center mb-6">Point camera at attendee QR code</p>

                {/* Manual lookup */}
                <div className="w-full bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted mb-2">Enter booking ref manually</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualRef}
                            onChange={e => setManualRef(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                            placeholder="HXL-XXXXXX"
                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent uppercase"
                        />
                        <button
                            onClick={handleManualLookup}
                            disabled={lookingUp || !manualRef}
                            className="px-4 py-2.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50 hover:bg-[#cc2f43] transition-colors"
                        >
                            {lookingUp ? '...' : 'Search'}
                        </button>
                    </div>
                </div>

                <Link href={`/organiser/events/${eventId}/attendees`} className="mt-4 text-xs text-muted hover:text-accent transition-colors">
                    ← View all attendees
                </Link>
            </div>

            {/* Result overlay */}
            {result && resultConfig && (
                <div className={`fixed inset-0 ${resultConfig.bg} flex flex-col items-center justify-center z-50 text-white`}>
                    <div className="text-7xl mb-4">{resultConfig.icon}</div>
                    <h2 className="font-heading text-3xl tracking-widest mb-2">{resultConfig.title}</h2>
                    <p className="text-lg opacity-90">{resultConfig.body}</p>
                </div>
            )}
        </div>
    )
}
