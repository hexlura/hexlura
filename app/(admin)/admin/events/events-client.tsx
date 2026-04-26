'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/config/categories'
import { formatPence } from '@/lib/fees'

type Tab = 'all' | 'featured' | 'cancelled'

interface EventRow {
    id: string
    title: string
    slug: string
    category: string
    status: string
    start_at: string
    is_featured: boolean
    featured_order: number
    organiser_name: string
    tickets_sold: number
    gross_pence: number
    fee_pence: number
}

interface Props {
    events: EventRow[]
    totalRows: number
    page: number
    pageSize: number
    defaultTab: Tab
}

const STATUS_BADGE: Record<string, string> = {
    published: 'text-success bg-success/10 border-success/20',
    draft: 'text-muted bg-muted/10 border-muted/20',
    cancelled: 'text-accent bg-accent/10 border-accent/20',
    archived: 'text-muted bg-muted/10 border-muted/20',
}


function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function AdminEventsClient({ events, totalRows, page, pageSize, defaultTab }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [tab, setTab] = useState<Tab>(defaultTab)
    const [cancelModal, setCancelModal] = useState<EventRow | null>(null)
    const [cancelConfirmTitle, setCancelConfirmTitle] = useState('')
    const [loading, setLoading] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
    }

    function switchTab(t: Tab) {
        setTab(t)
        updateParam('tab', t === 'all' ? '' : t)
    }

    async function handleFeatureToggle(event: EventRow) {
        setLoading(event.id)
        await fetch(`/api/admin/events/${event.id}/feature`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_featured: !event.is_featured, featured_order: event.featured_order }),
        })
        setLoading(null)
        showToast(event.is_featured ? 'Event unfeatured' : 'Event featured')
        router.refresh()
    }

    async function handleFeaturedOrderBlur(eventId: string, order: number) {
        await fetch(`/api/admin/events/${eventId}/feature`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_featured: true, featured_order: order }),
        })
    }

    async function handleDelist(eventId: string) {
        setLoading(eventId)
        await fetch(`/api/admin/events/${eventId}/delist`, { method: 'POST' })
        setLoading(null)
        showToast('Event delisted')
        router.refresh()
    }

    async function handleCancel() {
        if (!cancelModal || cancelConfirmTitle !== cancelModal.title) return
        setLoading(cancelModal.id)
        await fetch(`/api/admin/events/${cancelModal.id}/cancel`, { method: 'POST' })
        setLoading(null)
        setCancelModal(null)
        showToast('Event cancelled and refunds triggered')
        router.refresh()
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    const tabs = [
        { value: 'all' as Tab, label: 'All Events' },
        { value: 'featured' as Tab, label: 'Featured' },
        { value: 'cancelled' as Tab, label: 'Cancelled' },
    ]

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">EVENTS</h1>
                    <p className="text-muted text-sm mt-1">Moderate and manage events</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border">
                {tabs.map(t => (
                    <button
                        key={t.value}
                        onClick={() => switchTab(t.value)}
                        className={`px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 ${tab === t.value ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    type="search"
                    placeholder="Search by title..."
                    defaultValue={searchParams.get('q') ?? ''}
                    onChange={e => {
                        const v = e.target.value
                        clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st)
                        ;(window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => updateParam('q', v), 300)
                    }}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent w-56"
                />
                <select
                    defaultValue={searchParams.get('category') ?? ''}
                    onChange={e => updateParam('category', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    defaultValue={searchParams.get('status') ?? ''}
                    onChange={e => updateParam('status', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-none overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Title', 'Organiser', 'Category', 'Date', 'Status', 'Tickets', 'Gross Sales', 'Platform Fee', 'Featured', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 && (
                            <tr><td colSpan={10} className="text-center text-muted text-xs py-12">No events found</td></tr>
                        )}
                        {events.map(e => (
                            <tr key={e.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        {e.is_featured && <span className="text-gold text-xs">★</span>}
                                        <p className="text-text font-medium text-sm truncate max-w-[200px]">{e.title}</p>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs">{e.organiser_name}</td>
                                <td className="py-3 px-4 text-muted text-xs">{e.category}</td>
                                <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">{fmt(e.start_at)}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[e.status] || STATUS_BADGE.draft}`}>
                                        {e.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-text text-xs">{e.tickets_sold}</td>
                                <td className="py-3 px-4 text-text text-xs whitespace-nowrap">{formatPence(e.gross_pence)}</td>
                                <td className="py-3 px-4 text-gold text-xs whitespace-nowrap">{formatPence(e.fee_pence)}</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleFeatureToggle(e)}
                                            disabled={loading === e.id}
                                            style={{
                                                fontSize: '18px',
                                                color: e.is_featured ? '#F5A623' : '#C0C0C8',
                                                background: 'none', border: 'none',
                                                cursor: loading === e.id ? 'not-allowed' : 'pointer',
                                                padding: 0, lineHeight: 1,
                                            }}
                                            title={e.is_featured ? 'Unfeature' : 'Feature'}
                                        >
                                            {e.is_featured ? '★' : '☆'}
                                        </button>
                                        {e.is_featured && (
                                            <input
                                                type="number"
                                                defaultValue={e.featured_order}
                                                onBlur={ev => handleFeaturedOrderBlur(e.id, Number(ev.target.value))}
                                                style={{
                                                    width: '50px', border: '1px solid #E0E0E0',
                                                    padding: '2px 4px', fontSize: '12px',
                                                    textAlign: 'center', color: '#0A0A0F', outline: 'none',
                                                }}
                                                min={0}
                                                title="Featured order"
                                            />
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <Link href={`/events/${e.slug}`} target="_blank" className="text-muted hover:text-text">View</Link>
                                        {e.status !== 'archived' && e.status !== 'cancelled' && (
                                            <>
                                                <span className="text-border">·</span>
                                                <button
                                                    onClick={() => handleDelist(e.id)}
                                                    disabled={loading === e.id}
                                                    className="text-muted hover:text-accent"
                                                >
                                                    Delist
                                                </button>
                                                <span className="text-border">·</span>
                                                <button
                                                    onClick={() => { setCancelModal(e); setCancelConfirmTitle('') }}
                                                    className="text-accent hover:underline"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalRows)} of {totalRows}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <span className="text-xs px-3 py-1.5 text-muted">Page {page} of {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                </div>
            )}

            {/* Cancel Event Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-md w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Cancel Event?</h3>
                        <p className="text-sm text-muted mb-4">
                            This will cancel the event and trigger automatic refunds for ALL confirmed bookings.
                            This cannot be undone.
                        </p>
                        <p className="text-xs text-muted mb-2">Type the event name to confirm: <strong className="text-text">{cancelModal.title}</strong></p>
                        <input
                            type="text"
                            value={cancelConfirmTitle}
                            onChange={e => setCancelConfirmTitle(e.target.value)}
                            placeholder="Event title..."
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent mb-4"
                        />
                        <div className="flex gap-3">
                            <Button
                                variant="danger"
                                size="md"
                                onClick={handleCancel}
                                disabled={cancelConfirmTitle !== cancelModal.title || loading === cancelModal.id}
                            >
                                {loading === cancelModal.id ? 'Cancelling...' : 'Cancel Event & Refund All'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setCancelModal(null)}>Keep Event</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
