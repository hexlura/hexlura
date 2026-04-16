'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'
import { createClient } from '@/lib/supabase/client'

type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived'

interface EventRow {
    id: string
    title: string
    slug: string
    start_at: string
    status: EventStatus
    ticketsSold: number
    revenue: number
}

interface EventsClientProps {
    events: EventRow[]
}

const STATUS_COLORS: Record<string, string> = {
    published: 'text-success bg-success/10 border-success/20',
    draft: 'text-muted bg-muted/10 border-muted/20',
    cancelled: 'text-accent bg-accent/10 border-accent/20',
    archived: 'text-muted bg-muted/10 border-muted/20',
    past: 'text-muted bg-muted/10 border-muted/20',
}

type TabStatus = 'all' | 'draft' | 'published' | 'past' | 'cancelled'

export function EventsClient({ events }: EventsClientProps) {
    const [tab, setTab] = useState<TabStatus>('all')
    const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
    const [cancelling, setCancelling] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)


    const now = new Date()

    function getEffectiveStatus(e: EventRow): string {
        if (e.status === 'published' && new Date(e.start_at) < now) return 'past'
        return e.status
    }

    const filtered = events.filter(e => {
        if (tab === 'all') return true
        return getEffectiveStatus(e) === tab
    })

    const tabs: { value: TabStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'past', label: 'Past' },
        { value: 'cancelled', label: 'Cancelled' },
    ]

    async function handleDuplicate(eventId: string) {
        const res = await fetch(`/api/events/${eventId}/duplicate`, { method: 'POST' })
        if (res.ok) {
            const data = await res.json()
            window.location.href = `/organiser/events/${data.id}`
        }
    }

    async function handleCancel(eventId: string) {
        setCancelling(true)
        await fetch(`/api/events/${eventId}/cancel`, { method: 'POST' })
        setCancelling(false)
        setShowCancelModal(null)
        window.location.reload()
    }

    async function handleDelete(eventId: string) {
        setDeleting(true)
        const supabase = createClient()
        await supabase.from('ticket_types').delete().eq('event_id', eventId)
        await supabase.from('events').delete().eq('id', eventId)
        setDeleting(false)
        setShowDeleteModal(null)
        window.location.reload()
    }

    return (
        <>
            {/* Status filter tabs */}
            <div className="flex gap-1 mb-6 border-b border-border">
                {tabs.map(t => (
                    <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 ${tab === t.value ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-none p-16 text-center">
                    <p className="text-muted text-sm">No events yet. Create your first event.</p>
                    <Link href="/organiser/events/new">
                        <Button variant="primary" size="md" className="mt-4">Create Event</Button>
                    </Link>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-none">
                    <div className="overflow-x-auto">
                    <table className="hidden sm:table w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Title', 'Date', 'Status', 'Tickets Sold', 'Revenue', 'Actions'].map(h => (
                                    <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => {
                                const effStatus = getEffectiveStatus(e)
                                return (
                                    <tr key={e.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                        <td className="py-3 px-4">
                                            <p className="text-text font-medium text-sm truncate max-w-[220px]">{e.title}</p>
                                        </td>
                                        <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">
                                            {new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[effStatus] || STATUS_COLORS.draft}`}>
                                                {effStatus}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-text text-xs">{e.ticketsSold}</td>
                                        <td className="py-3 px-4 text-text text-xs">{formatPence(e.revenue)}</td>
                                        <td className="py-3 px-4">
                                            {/* Table actions — inline links, visible at sm+ */}
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <Link href={`/organiser/events/${e.id}`} className="text-xs text-muted hover:text-text transition-colors">Edit</Link>
                                                <span className="text-border">·</span>
                                                <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-text transition-colors">View</a>
                                                <span className="text-border">·</span>
                                                <Link href={`/organiser/events/${e.id}/attendees`} className="text-xs text-muted hover:text-text transition-colors">Attendees</Link>
                                                <span className="text-border">·</span>
                                                <Link href={`/organiser/events/${e.id}/checkin`} className="text-xs text-muted hover:text-text transition-colors">Check-in</Link>
                                                <span className="text-border">·</span>
                                                <button type="button" onClick={() => handleDuplicate(e.id)} className="text-xs text-muted hover:text-text transition-colors">Duplicate</button>
                                                {e.status !== 'cancelled' && (
                                                    <>
                                                        <span className="text-border">·</span>
                                                        <button type="button" onClick={() => setShowCancelModal(e.id)} className="text-xs text-accent hover:underline">Cancel</button>
                                                    </>
                                                )}
                                                {e.ticketsSold === 0 && (
                                                    <>
                                                        <span className="text-border">·</span>
                                                        <button type="button" onClick={() => setShowDeleteModal(e.id)} className="text-xs text-accent hover:underline">Delete</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    </div>

                    {/* Mobile card list */}
                    <div className="block sm:hidden divide-y divide-border">
                        {filtered.map(e => {
                            const effStatus = getEffectiveStatus(e)
                            return (
                                <div key={e.id} className="p-4 space-y-2">
                                    <p className="text-text font-semibold text-sm">{e.title}</p>
                                    <p className="text-muted text-xs">
                                        {new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[effStatus] || STATUS_COLORS.draft}`}>
                                        {effStatus}
                                    </span>
                                    <div className="flex items-center gap-4 text-xs text-muted pt-1">
                                        <span>{e.ticketsSold} tickets</span>
                                        <span>{formatPence(e.revenue)}</span>
                                    </div>
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={(ev) => { ev.stopPropagation(); setOpenMenuId(openMenuId === e.id ? null : e.id) }}
                                            className="w-full text-center py-2 border border-border text-xs text-text bg-surface hover:bg-card transition-colors"
                                        >
                                            Actions {openMenuId === e.id ? '▴' : '▾'}
                                        </button>
                                        {openMenuId === e.id && (
                                            <div className="border border-t-0 border-border bg-card divide-y divide-border/50">
                                                <Link href={`/organiser/events/${e.id}`} className="block px-4 py-3 text-xs text-muted hover:text-text hover:bg-surface transition-colors">Edit</Link>
                                                <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-xs text-muted hover:text-text hover:bg-surface transition-colors">View Public Page</a>
                                                <Link href={`/organiser/events/${e.id}/attendees`} className="block px-4 py-3 text-xs text-muted hover:text-text hover:bg-surface transition-colors">Attendees</Link>
                                                <Link href={`/organiser/events/${e.id}/checkin`} className="block px-4 py-3 text-xs text-muted hover:text-text hover:bg-surface transition-colors">Check-in Scanner</Link>
                                                <button type="button" onClick={() => handleDuplicate(e.id)} className="block w-full text-left px-4 py-3 text-xs text-muted hover:text-text hover:bg-surface transition-colors">Duplicate</button>
                                                {e.status !== 'cancelled' && (
                                                    <button type="button" onClick={() => setShowCancelModal(e.id)} className="block w-full text-left px-4 py-3 text-xs text-accent hover:bg-surface transition-colors">Cancel Event</button>
                                                )}
                                                {e.ticketsSold === 0 && (
                                                    <button type="button" onClick={() => setShowDeleteModal(e.id)} className="block w-full text-left px-4 py-3 text-xs text-accent hover:bg-surface transition-colors">Delete Event</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Cancel confirmation modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Cancel Event?</h3>
                        <p className="text-sm text-muted mb-4">
                            This will cancel the event and notify all attendees by email.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={() => handleCancel(showCancelModal)} disabled={cancelling}>
                                {cancelling ? 'Cancelling...' : 'Yes, Cancel Event'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setShowCancelModal(null)}>Keep Event</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Delete Event?</h3>
                        <p className="text-sm text-muted mb-4">
                            This will permanently delete the event and all its ticket types.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={() => handleDelete(showDeleteModal)} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Yes, Delete Event'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setShowDeleteModal(null)}>Keep Event</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
