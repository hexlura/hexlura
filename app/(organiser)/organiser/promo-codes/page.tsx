'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface EventRow {
    id: string
    title: string
    start_at: string
    venue_name: string | null
}

interface TicketType {
    id: string
    name: string
    price_pence: number
}

export default function PromoCodesLandingPage() {
    const router = useRouter()
    const [step, setStep] = useState<'event' | 'ticketType'>('event')
    const [events, setEvents] = useState<EventRow[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null)
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
    const [loadingTypes, setLoadingTypes] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase
            .from('events')
            .select('id, title, start_at, venue_name')
            .eq('status', 'published')
            .order('start_at', { ascending: true })
            .then(({ data }) => {
                setEvents(data || [])
                setLoadingEvents(false)
            })
    }, [])

    async function pickEvent(ev: EventRow) {
        setSelectedEvent(ev)
        setStep('ticketType')
        setLoadingTypes(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('ticket_types')
            .select('id, name, price_pence')
            .eq('event_id', ev.id)
            .order('sort_order')
        setTicketTypes(data || [])
        setLoadingTypes(false)
    }

    function pickTicketType(ticketTypeId: string | null) {
        if (!selectedEvent) return
        const query = ticketTypeId ? `?ticket_type_id=${ticketTypeId}` : ''
        router.push(`/organiser/events/${selectedEvent.id}/promo-codes${query}`)
    }

    return (
        <div className="max-w-3xl">
            {step === 'ticketType' && (
                <button
                    onClick={() => setStep('event')}
                    className="text-xs text-muted hover:text-text flex items-center gap-1.5 mb-4"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    All events
                </button>
            )}

            <h1 className="font-heading text-4xl text-text tracking-wide mb-1">PROMO CODES</h1>

            {step === 'event' ? (
                <>
                    <p className="text-sm text-muted mb-6">Select a live event to manage its promo codes</p>
                    {loadingEvents ? (
                        <p className="text-muted text-center py-8">Loading events…</p>
                    ) : events.length === 0 ? (
                        <p className="text-muted text-center py-8">No published events yet.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {events.map(ev => (
                                <button
                                    key={ev.id}
                                    onClick={() => pickEvent(ev)}
                                    className="w-full text-left bg-surface border border-border hover:border-accent transition-colors p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-text truncate">{ev.title}</p>
                                        <p className="text-xs text-muted mt-0.5">
                                            {new Date(ev.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {ev.venue_name && ` · ${ev.venue_name}`}
                                        </p>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" className="shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <p className="text-sm text-muted mb-6">
                        for <span className="text-text font-medium">{selectedEvent?.title}</span> — select a ticket type
                    </p>
                    {loadingTypes ? (
                        <p className="text-muted text-center py-8">Loading ticket types…</p>
                    ) : (
                        <div className="space-y-2.5">
                            {ticketTypes.map(tt => (
                                <button
                                    key={tt.id}
                                    onClick={() => pickTicketType(tt.id)}
                                    className="w-full text-left bg-surface border border-border hover:border-accent transition-colors p-4 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-text">{tt.name}</p>
                                        <p className="text-xs text-muted mt-0.5">{(tt.price_pence / 100).toFixed(2)}</p>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" className="shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                                </button>
                            ))}
                            <button
                                onClick={() => pickTicketType(null)}
                                className="w-full text-left border border-dashed border-border hover:border-accent transition-colors p-4 flex items-center justify-between gap-4 text-muted text-xs"
                            >
                                <span>Don&apos;t scope to one ticket type — apply across the whole event, like today</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" className="shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
