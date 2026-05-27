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

    const label = categories.length > 0
        ? categories.map(c => c.toUpperCase()).join(' · ')
        : 'YOUR INTERESTS'

    return (
        <section style={{ marginTop: '60px', paddingBottom: '16px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '2px solid #F0F0F0',
                paddingBottom: '12px',
            }}>
                <div>
                    <p style={{ fontSize: '11px', color: '#E63950', fontWeight: 700, letterSpacing: '2px', margin: '0 0 2px' }}>
                        RECOMMENDED FOR YOU
                    </p>
                    <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: '#0A0A0F', letterSpacing: '1px', margin: 0 }}>
                        {label}
                    </h2>
                </div>
                {categories[0] && (
                    <Link
                        href={`/events?category=${encodeURIComponent(categories[0])}`}
                        style={{ fontSize: '13px', color: '#E63950', fontWeight: 600, textDecoration: 'none' }}
                    >
                        See All &rarr;
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {events.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </section>
    )
}
