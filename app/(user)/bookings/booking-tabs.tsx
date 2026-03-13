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
    confirmed: 'bg-success/20 text-success',
    cancelled: 'bg-accent/20 text-accent',
    refunded: 'bg-gold/20 text-gold',
}

function BookingCard({ booking }: { booking: Booking }) {
    const event = booking.event
    const dateStr = event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(event.start_at))
        : ''

    const ticketCount = booking.items?.reduce((s, i) => s + i.quantity, 0) || 0

    return (
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-4 hover:border-accent/30 transition">
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text text-lg">{event?.title || 'Event'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[booking.status] || 'bg-muted/20 text-muted'}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </div>
                <p className="text-sm text-muted">{dateStr}</p>
                {event?.venue_name && (
                    <p className="text-sm text-muted">{event.venue_name}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-muted">{booking.booking_ref}</span>
                    {ticketCount > 0 && <span className="text-muted">{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</span>}
                    {booking.total_pence && <span className="font-medium text-text">{formatPence(booking.total_pence)}</span>}
                </div>
            </div>
            <div className="flex items-center">
                <Link
                    href={`/bookings/${booking.booking_ref}`}
                    className="h-10 px-5 rounded-lg border border-border bg-card text-text text-sm font-medium hover:bg-card/80 transition flex items-center gap-1 whitespace-nowrap"
                >
                    View Ticket →
                </Link>
            </div>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
            <p className="text-muted mb-4">{message}</p>
            <Link href="/events" className="text-accent hover:underline text-sm font-medium">
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
        <div className="space-y-6">
            <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 h-10 rounded-md text-sm font-medium transition ${
                            tab === t.key
                                ? 'bg-accent text-white'
                                : 'text-muted hover:text-text'
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
