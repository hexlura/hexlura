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

export default function PromoCodesLandingPage() {
    const router = useRouter()
    const [events, setEvents] = useState<EventRow[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)

    useEffect(() => {
        async function loadOwnEvents() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoadingEvents(false); return }

            const { data: organiser } = await supabase
                .from('organiser_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()
            if (!organiser) { setLoadingEvents(false); return }

            const { data } = await supabase
                .from('events')
                .select('id, title, start_at, venue_name')
                .eq('organiser_id', organiser.id)
                .eq('status', 'published')
                .order('start_at', { ascending: true })

            setEvents(data || [])
            setLoadingEvents(false)
        }
        loadOwnEvents()
    }, [])

    return (
        <div className="max-w-3xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-1">PROMO CODES</h1>
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
                            onClick={() => router.push(`/organiser/events/${ev.id}/promo-codes`)}
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
        </div>
    )
}
