'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Event } from '@/types'
import EventCard from '@/components/events/EventCard'

export default function RecommendedEvents() {
    const [events, setEvents] = useState<Event[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/user/recommended-events')
            .then(r => r.json())
            .then(data => {
                setEvents(data.events || [])
                setCategories(data.categories || [])
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    if (loading || events.length === 0) return null

    const basedOn = categories.length > 0 ? categories.join(' · ') : 'your interests'

    return (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 mt-14">
            <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-heading text-2xl lg:text-3xl tracking-wide">RECOMMENDED FOR YOU</h2>
                {categories[0] ? (
                    <Link
                        href={`/events?category=${encodeURIComponent(categories[0])}`}
                        className="text-sm font-semibold text-accent hover:underline"
                    >
                        See all →
                    </Link>
                ) : (
                    <span className="text-xs text-muted">Based on {basedOn}</span>
                )}
            </div>
            {categories.length > 0 && (
                <p className="text-xs text-muted -mt-3 mb-5">Based on {basedOn}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                {events.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </section>
    )
}
