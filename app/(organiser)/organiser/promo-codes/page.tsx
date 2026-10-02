'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface EventRow {
    id: string
    title: string
    start_at: string
    venue_name: string | null
}

// Decorative event thumbnails, cycled in list order (as in the design)
const THUMB_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

export default function PromoCodesLandingPage() {
    const [events, setEvents] = useState<EventRow[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        async function loadOwnEvents() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: organiser, error: orgErr } = await supabase
                    .from('organiser_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()
                if (orgErr) throw orgErr
                if (!organiser) return

                const { data, error } = await supabase
                    .from('events')
                    .select('id, title, start_at, venue_name')
                    .eq('organiser_id', organiser.id)
                    .eq('status', 'published')
                    .order('start_at', { ascending: true })
                if (error) throw error

                setEvents(data || [])
            } catch (e) {
                console.error('[PromoCodes] load events failed:', e)
                setLoadError('Could not load your events. Please refresh and try again.')
            } finally {
                setLoadingEvents(false)
            }
        }
        loadOwnEvents()
    }, [])

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">PROMO CODES</h1>
                <p className="text-muted text-sm mt-1">Select a live event to manage its promo codes</p>
            </div>

            {loadingEvents ? (
                <p className="text-muted text-sm text-center py-12">Loading events…</p>
            ) : loadError ? (
                <p className="text-warm-red text-sm text-center py-12">{loadError}</p>
            ) : events.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                    <p className="text-muted text-sm">No published events yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {events.map((ev, i) => (
                        <Link
                            key={ev.id}
                            href={`/organiser/events/${ev.id}/promo-codes`}
                            className="bg-card rounded-2xl shadow-card p-5 flex flex-col gap-3 hover:shadow-hover transition-shadow"
                        >
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]}`} />
                            <div>
                                <p className="text-sm font-semibold truncate">{ev.title}</p>
                                <p className="text-xs text-muted mt-0.5">
                                    {new Date(ev.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {ev.venue_name && ` · ${ev.venue_name}`}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-accent mt-1">Manage codes →</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
