'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'

type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived'

interface EventRow {
    id: string
    title: string
    slug: string
    start_at: string
    status: EventStatus
    ticketsSold: number
    capacity: number
    revenue: number
}

interface EventsClientProps {
    events: EventRow[]
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    published: { label: 'Published', cls: 'text-warm-green bg-warm-green/10' },
    draft: { label: 'Draft', cls: 'text-warm-yellowText bg-warm-yellow/10' },
    past: { label: 'Past', cls: 'text-muted bg-border' },
    cancelled: { label: 'Cancelled', cls: 'text-warm-red bg-warm-red/10' },
    archived: { label: 'Archived', cls: 'text-muted bg-border' },
}

// Decorative event thumbnails, cycled in list order (as in the design)
const THUMB_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

type TabStatus = 'all' | 'draft' | 'published' | 'past' | 'cancelled'

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function EventsClient({ events }: EventsClientProps) {
    const [tab, setTab] = useState<TabStatus>('all')

    const now = new Date()

    function getEffectiveStatus(e: EventRow): string {
        if (e.status === 'published' && new Date(e.start_at) < now) return 'past'
        return e.status
    }

    const filtered = events.filter(e => {
        if (tab === 'all') return true
        return getEffectiveStatus(e) === tab
    })

    const countFor = (value: TabStatus) =>
        value === 'all' ? events.length : events.filter(e => getEffectiveStatus(e) === value).length

    const tabs: { value: TabStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'past', label: 'Past' },
        { value: 'cancelled', label: 'Cancelled' },
    ]

    const sold = (e: EventRow) => (e.capacity > 0 ? `${e.ticketsSold} / ${e.capacity}` : String(e.ticketsSold))

    return (
        <>
            {/* Status tabs */}
            <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
                {tabs.map(t => {
                    const active = tab === t.value
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTab(t.value)}
                            className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                                active ? 'font-medium text-text border-accent' : 'text-muted border-transparent hover:text-text'
                            }`}
                        >
                            {t.label} <span className={`font-normal ${active ? 'text-muted' : ''}`}>({countFor(t.value)})</span>
                        </button>
                    )
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-16 text-center">
                    <p className="text-muted text-sm">
                        {events.length === 0 ? 'No events yet. Create your first event.' : 'No events in this category.'}
                    </p>
                    {events.length === 0 && (
                        <Link
                            href="/organiser/events/new"
                            className="inline-flex mt-4 bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all items-center gap-2"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                            New Event
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="hidden sm:table w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3.5 px-6">Event</th>
                                    <th className="font-medium py-3.5 px-4">Date</th>
                                    <th className="font-medium py-3.5 px-4">Status</th>
                                    <th className="font-medium py-3.5 px-4 text-right">Sold</th>
                                    <th className="font-medium py-3.5 px-4 text-right">Revenue</th>
                                    <th className="font-medium py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, i) => {
                                    const status = STATUS_STYLES[getEffectiveStatus(e)] || STATUS_STYLES.draft
                                    return (
                                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} shrink-0`} />
                                                    <p className="font-medium truncate max-w-[220px]">{e.title}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-muted text-xs whitespace-nowrap">{fmtDate(e.start_at)}</td>
                                            <td className="py-4 px-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium">{sold(e)}</td>
                                            <td className="py-4 px-4 text-right font-medium">{formatPence(e.revenue)}</td>
                                            <td className="py-4 px-6 text-right">
                                                <Link href={`/organiser/events/${e.id}`} className="text-xs text-accent font-semibold hover:underline">Manage →</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile card list (the design is desktop-only; same visual language) */}
                    <div className="block sm:hidden divide-y divide-border">
                        {filtered.map((e, i) => {
                            const status = STATUS_STYLES[getEffectiveStatus(e)] || STATUS_STYLES.draft
                            return (
                                <div key={e.id} className="p-4 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} shrink-0`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{e.title}</p>
                                        <p className="text-muted text-xs mt-0.5">{fmtDate(e.start_at)} · {sold(e)} sold · {formatPence(e.revenue)}</p>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                                            <Link href={`/organiser/events/${e.id}`} className="text-xs text-accent font-semibold hover:underline">Manage →</Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}
