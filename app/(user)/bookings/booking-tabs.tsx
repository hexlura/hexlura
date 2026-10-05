'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Booking } from '@/types'
import { formatPence } from '@/lib/fees'

interface BookingTabsProps {
    upcoming: Booking[]
    past: Booking[]
    cancelled: Booking[]
}

const STATUS_BADGE: Record<string, string> = {
    confirmed: 'bg-warm-green/15 text-warm-green',
    cancelled: 'bg-warm-red/10 text-warm-red',
    refunded: 'bg-warm-amber/15 text-warm-amberText',
}

function BookingCard({ booking }: { booking: Booking }) {
    const event = booking.event
    const dateStr = event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            timeZone: 'Europe/London',
        }).format(new Date(event.start_at))
        : ''

    const ticketCount = booking.items?.reduce((s, i) => s + i.quantity, 0) || 0

    return (
        <Link
            href={`/bookings/${booking.booking_ref}`}
            className="flex items-center gap-4 bg-card rounded-2xl border border-border shadow-soft hover:shadow-hover transition p-3"
        >
            <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-accent to-warm-orange shrink-0">
                {event?.banner_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-sm mb-1 truncate">{event?.title || 'Event'}</p>
                    <p className="text-xs text-muted mb-1 truncate">
                        {[event?.venue_name, dateStr].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs font-mono text-muted">
                        {booking.booking_ref}
                        {ticketCount > 0 && <span className="font-sans"> · {ticketCount} ticket{ticketCount > 1 ? 's' : ''}</span>}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    {booking.total_pence ? <p className="font-heading text-lg mb-1">{formatPence(booking.total_pence)}</p> : null}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${STATUS_BADGE[booking.status] || 'bg-border text-muted'}`}>
                        {booking.status}
                    </span>
                </div>
            </div>
        </Link>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border">
            <p className="text-muted mb-4">{message}</p>
            <Link href="/events" className="text-accent hover:underline text-sm font-semibold">
                Browse events
            </Link>
        </div>
    )
}

export default function BookingTabs({ upcoming, past, cancelled }: BookingTabsProps) {
    const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')

    const tabs = [
        { key: 'upcoming' as const, label: 'Upcoming', count: upcoming.length },
        { key: 'past' as const, label: 'Past', count: past.length },
        { key: 'cancelled' as const, label: 'Cancelled', count: cancelled.length },
    ]

    const currentBookings = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled

    return (
        <div>
            <div className="flex items-center gap-6 border-b border-border mb-6 text-sm font-semibold">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`pb-3 border-b-2 transition ${
                            tab === t.key
                                ? 'text-text border-accent'
                                : 'text-muted border-transparent hover:text-text'
                        }`}
                    >
                        {t.label} ({t.count})
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {currentBookings.length > 0 ? (
                    currentBookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                    ))
                ) : (
                    <EmptyState
                        message={
                            tab === 'upcoming' ? 'No upcoming bookings yet.' :
                            tab === 'past' ? 'No past bookings.' :
                            'No cancelled bookings.'
                        }
                    />
                )}
            </div>
        </div>
    )
}
