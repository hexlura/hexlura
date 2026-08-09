'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
    CONTACT_TOPICS, ENQUIRY_PRIORITIES, ENQUIRIES_UPDATED_EVENT, topicLabel, priorityLabel,
    type ContactEnquiryRow, type EnquirySortColumn,
} from '@/lib/contact'

interface Props {
    enquiries: ContactEnquiryRow[]
    totalRows: number
    page: number
    pageSize: number
    availableSources: string[]
    sort: EnquirySortColumn
    direction: 'asc' | 'desc'
    loadError: boolean
}

const SORT_HEADERS: { key: EnquirySortColumn; label: string }[] = [
    { key: 'created_at', label: 'Created' },
    { key: 'topic', label: 'Topic' },
    { key: 'source', label: 'Source' },
    { key: 'is_read', label: 'Read' },
    { key: 'is_connected', label: 'Connected' },
    { key: 'is_converted', label: 'Converted' },
    { key: 'upcoming_schedule', label: 'Schedule' },
    { key: 'priority', label: 'Priority' },
]

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string) {
    return new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

function toDatetimeLocalValue(iso: string): string {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Badge({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${active ? 'text-success bg-success/10 border-success/30' : 'text-muted bg-muted/10 border-border'}`}>
            {active ? activeLabel : inactiveLabel}
        </span>
    )
}

function priorityBadgeClasses(p: string | null): string {
    switch (p) {
        case 'high': return 'text-accent bg-accent/10 border-accent/30'
        case 'medium': return 'text-gold bg-gold/10 border-gold/30'
        case 'low': return 'text-muted bg-muted/10 border-border'
        default: return 'text-muted bg-transparent border-border'
    }
}

export function EnquiriesClient({ enquiries, totalRows, page, pageSize, availableSources, sort, direction, loadError }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [filterSearch, setFilterSearch] = useState(searchParams.get('search') ?? '')
    const [filterTopic, setFilterTopic] = useState(searchParams.get('topic') ?? '')
    const [filterSource, setFilterSource] = useState(searchParams.get('source') ?? '')
    const [filterIsRead, setFilterIsRead] = useState(searchParams.get('is_read') ?? '')
    const [filterIsConnected, setFilterIsConnected] = useState(searchParams.get('is_connected') ?? '')
    const [filterIsConverted, setFilterIsConverted] = useState(searchParams.get('is_converted') ?? '')
    const [filterSchedule, setFilterSchedule] = useState(searchParams.get('schedule') ?? '')
    const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') ?? '')

    useEffect(() => {
        setFilterSearch(searchParams.get('search') ?? '')
        setFilterTopic(searchParams.get('topic') ?? '')
        setFilterSource(searchParams.get('source') ?? '')
        setFilterIsRead(searchParams.get('is_read') ?? '')
        setFilterIsConnected(searchParams.get('is_connected') ?? '')
        setFilterIsConverted(searchParams.get('is_converted') ?? '')
        setFilterSchedule(searchParams.get('schedule') ?? '')
        setFilterPriority(searchParams.get('priority') ?? '')
    }, [searchParams])

    const hasActiveFilters = Boolean(
        filterSearch || filterTopic || filterSource || filterIsRead || filterIsConnected || filterIsConverted || filterSchedule || filterPriority
    )

    const [detailId, setDetailId] = useState<string | null>(null)
    const detail = enquiries.find(e => e.id === detailId) ?? null

    const [editPriority, setEditPriority] = useState('')
    const [editSummary, setEditSummary] = useState('')
    const [editSchedule, setEditSchedule] = useState('')
    const [editIsRead, setEditIsRead] = useState(false)
    const [editIsConnected, setEditIsConnected] = useState(false)
    const [editIsConverted, setEditIsConverted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (!detail) return
        setEditPriority(detail.priority ?? '')
        setEditSummary(detail.lead_summary ?? '')
        setEditSchedule(detail.upcoming_schedule ? toDatetimeLocalValue(detail.upcoming_schedule) : '')
        setEditIsRead(detail.is_read)
        setEditIsConnected(detail.is_connected)
        setEditIsConverted(detail.is_converted)
        // Re-sync whenever the selected enquiry (or its server data after a
        // refresh) changes — not on every edit keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.id, detail?.priority, detail?.lead_summary, detail?.upcoming_schedule, detail?.is_read, detail?.is_connected, detail?.is_converted])

    const hasUnsavedChanges = Boolean(detail) && (
        editPriority !== (detail!.priority ?? '') ||
        editSummary.trim() !== (detail!.lead_summary ?? '') ||
        editSchedule !== (detail!.upcoming_schedule ? toDatetimeLocalValue(detail!.upcoming_schedule) : '') ||
        editIsRead !== detail!.is_read ||
        editIsConnected !== detail!.is_connected ||
        editIsConverted !== detail!.is_converted
    )

    function showToast(text: string, tone: 'success' | 'error' = 'success') {
        setToastMsg({ text, tone })
        setTimeout(() => setToastMsg(null), 3000)
    }

    function buildParams() {
        const params = new URLSearchParams()
        if (filterSearch.trim()) params.set('search', filterSearch.trim())
        if (filterTopic) params.set('topic', filterTopic)
        if (filterSource) params.set('source', filterSource)
        if (filterIsRead) params.set('is_read', filterIsRead)
        if (filterIsConnected) params.set('is_connected', filterIsConnected)
        if (filterIsConverted) params.set('is_converted', filterIsConverted)
        if (filterSchedule) params.set('schedule', filterSchedule)
        if (filterPriority) params.set('priority', filterPriority)
        if (sort !== 'created_at') params.set('sort', sort)
        if (direction !== 'desc') params.set('direction', direction)
        return params
    }

    function applyFilters() {
        const params = buildParams()
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    function resetFilters() {
        setFilterSearch(''); setFilterTopic(''); setFilterSource('')
        setFilterIsRead(''); setFilterIsConnected(''); setFilterIsConverted('')
        setFilterSchedule(''); setFilterPriority('')
        router.push(pathname, { scroll: false })
    }

    function gotoPage(nextPage: number) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', String(nextPage))
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    function toggleSort(column: EnquirySortColumn) {
        const params = new URLSearchParams(searchParams.toString())
        if (sort === column) {
            params.set('direction', direction === 'asc' ? 'desc' : 'asc')
        } else {
            params.set('sort', column)
            params.set('direction', 'desc')
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    async function handleSaveChanges() {
        if (!detail || saving) return

        // Validation: priority must be empty or a known option; schedule (if set) must parse.
        if (editPriority && !ENQUIRY_PRIORITIES.some(p => p.value === editPriority)) {
            showToast('Invalid priority selected', 'error')
            return
        }
        if (editSchedule && Number.isNaN(new Date(editSchedule).getTime())) {
            showToast('Invalid schedule date/time', 'error')
            return
        }

        setSaving(true)
        try {
            const body: Record<string, unknown> = {
                is_read: editIsRead,
                is_connected: editIsConnected,
                is_converted: editIsConverted,
                priority: editPriority || null,
                lead_summary: editSummary.trim() || null,
                upcoming_schedule: editSchedule ? new Date(editSchedule).toISOString() : null,
            }

            const res = await fetch(`/api/admin/contact-enquiries/${detail.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                showToast(data.error || 'Update failed', 'error')
                return
            }
            showToast('Saved successfully')
            window.dispatchEvent(new Event(ENQUIRIES_UPDATED_EVENT))
            router.refresh()
        } catch (err) {
            console.error(err)
            showToast('Network error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const rangeStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const rangeEnd = Math.min(page * pageSize, totalRows)

    const selectClass = 'bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent'

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-4 right-4 z-50 border px-4 py-2 rounded-sm text-sm ${toastMsg.tone === 'success' ? 'bg-success/20 border-success/40 text-success' : 'bg-accent/20 border-accent/40 text-accent'}`}
                >
                    {toastMsg.text}
                </div>
            )}

            <div className="mb-6">
                <h1 className="font-heading text-4xl text-text tracking-wide">ENQUIRIES</h1>
                <p className="text-muted text-sm mt-1">Manage and track contact enquiries from customers, organisers, partners, and other sources.</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); applyFilters() }} className="mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1 xl:col-span-2">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-search">Search</label>
                        <input
                            id="enq-search"
                            type="search"
                            placeholder="Name or email…"
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-topic">Topic</label>
                        <select id="enq-topic" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            {CONTACT_TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-source">Source</label>
                        <select id="enq-source" value={filterSource} onChange={e => setFilterSource(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-read">Read</label>
                        <select id="enq-read" value={filterIsRead} onChange={e => setFilterIsRead(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            <option value="true">Read</option>
                            <option value="false">Unread</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-connected">Connected</label>
                        <select id="enq-connected" value={filterIsConnected} onChange={e => setFilterIsConnected(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            <option value="true">Connected</option>
                            <option value="false">Not connected</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-converted">Converted</label>
                        <select id="enq-converted" value={filterIsConverted} onChange={e => setFilterIsConverted(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            <option value="true">Converted</option>
                            <option value="false">Not converted</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-schedule">Schedule</label>
                        <select id="enq-schedule" value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="not_scheduled">Not scheduled</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wider text-muted" htmlFor="enq-priority">Priority</label>
                        <select id="enq-priority" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="">All</option>
                            {ENQUIRY_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                    <button type="submit" className="px-4 py-2 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
                        Apply
                    </button>
                    {hasActiveFilters && (
                        <button type="button" onClick={resetFilters} className="px-4 py-2 bg-background border border-border text-text text-sm font-semibold hover:bg-gray-50 transition-colors">
                            Reset
                        </button>
                    )}
                </div>
            </form>

            {loadError && (
                <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3 rounded-sm mb-4">
                    Something went wrong loading enquiries. Try refreshing the page.
                </div>
            )}

            <div className="bg-card border border-border rounded-none overflow-x-auto mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th scope="col" className="text-left text-xs text-muted py-3 px-3 font-normal">Contact</th>
                            <th scope="col" className="text-left text-xs text-muted py-3 px-3 font-normal">Organization</th>
                            {SORT_HEADERS.map(h => (
                                <th key={h.key} scope="col" className="text-left text-xs text-muted py-3 px-3 font-normal">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(h.key)}
                                        className="flex items-center gap-1 hover:text-text transition-colors"
                                        aria-label={`Sort by ${h.label}${sort === h.key ? `, currently ${direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
                                    >
                                        {h.label}
                                        {sort === h.key && <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>}
                                    </button>
                                </th>
                            ))}
                            <th scope="col" className="text-left text-xs text-muted py-3 px-3 font-normal">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enquiries.length === 0 && !loadError && (
                            <tr>
                                <td colSpan={11} className="text-center text-muted text-xs py-12">
                                    No enquiries found. Try changing your search or filters.
                                </td>
                            </tr>
                        )}
                        {enquiries.map(e => (
                            <tr key={e.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-2.5 px-3">
                                    <div className={`text-xs text-text ${e.is_read ? '' : 'font-semibold'}`}>{e.name}</div>
                                    <div className="text-xs text-muted">{e.email}</div>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-muted max-w-[140px] truncate">{e.organization_name}</td>
                                <td className="py-2.5 px-3 text-xs text-text whitespace-nowrap">{fmtDate(e.created_at)}</td>
                                <td className="py-2.5 px-3 text-xs text-muted max-w-[140px] truncate">{topicLabel(e.topic)}</td>
                                <td className="py-2.5 px-3 text-xs text-muted">{e.source}</td>
                                <td className="py-2.5 px-3"><Badge active={e.is_read} activeLabel="Read" inactiveLabel="Unread" /></td>
                                <td className="py-2.5 px-3"><Badge active={e.is_connected} activeLabel="Connected" inactiveLabel="NILL" /></td>
                                <td className="py-2.5 px-3"><Badge active={e.is_converted} activeLabel="Converted" inactiveLabel="NILL" /></td>
                                <td className="py-2.5 px-3 text-xs text-muted whitespace-nowrap">{e.upcoming_schedule ? fmtDateTime(e.upcoming_schedule) : '—'}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityBadgeClasses(e.priority)}`}>
                                        {priorityLabel(e.priority)}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <button onClick={() => setDetailId(e.id)} className="text-xs text-accent hover:underline">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-muted">
                    {totalRows === 0 ? 'No enquiries' : `Showing ${rangeStart}–${rangeEnd} of ${totalRows} enquiries`}
                </p>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                        <button disabled={page <= 1} onClick={() => gotoPage(page - 1)} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => gotoPage(page + 1)} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                )}
            </div>

            {detail && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetailId(null)}>
                    <div
                        className="bg-card border border-border rounded-none p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Enquiry details"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-heading text-2xl text-text tracking-wide">ENQUIRY DETAILS</h3>
                                <p className="text-sm text-muted mt-1">{fmtDateTime(detail.created_at)}</p>
                            </div>
                            <button onClick={() => setDetailId(null)} className="text-muted hover:text-text text-xl leading-none" aria-label="Close">×</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            <div className="flex flex-col gap-5">
                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Contact information</h4>
                                    <p className="text-text font-medium">{detail.name}</p>
                                    <p className="text-muted text-xs">{detail.email}</p>
                                    {detail.phone && <p className="text-muted text-xs">{detail.phone}</p>}
                                    <p className="text-muted text-xs mt-1">{detail.organization_name}</p>
                                </section>

                                <section>
                                    <h4 className="text-xs uppercase tracking-wider text-muted mb-2">Enquiry information</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-2">
                                        <p className="text-text text-xs"><span className="text-muted">Topic:</span> {topicLabel(detail.topic)}</p>
                                        <p className="text-text text-xs"><span className="text-muted">Source:</span> {detail.source}</p>
                                        {detail.page_path && <p className="text-text text-xs"><span className="text-muted">Page:</span> {detail.page_path}</p>}
                                        <p className="text-text text-xs"><span className="text-muted">Created:</span> {fmtDateTime(detail.created_at)}</p>
                                        <p className="text-text text-xs"><span className="text-muted">Updated:</span> {fmtDateTime(detail.updated_at)}</p>
                                    </div>
                                    <div className="bg-surface border border-border p-3 text-xs text-text whitespace-pre-wrap break-words">
                                        {detail.event_details}
                                    </div>
                                </section>
                            </div>

                            <section className="lg:border-l lg:border-t-0 border-t border-border lg:pl-6 pt-4 lg:pt-0">
                                <h4 className="text-xs uppercase tracking-wider text-muted mb-3">Lead management</h4>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditIsRead(v => !v)}
                                        disabled={saving}
                                        aria-pressed={editIsRead}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${editIsRead ? 'text-success bg-success/10 border-success/30' : 'text-muted bg-muted/10 border-border'}`}
                                    >
                                        Read {editIsRead ? '✓' : ''}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditIsConnected(v => !v)}
                                        disabled={saving}
                                        aria-pressed={editIsConnected}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${editIsConnected ? 'text-success bg-success/10 border-success/30' : 'text-muted bg-muted/10 border-border'}`}
                                    >
                                        Connected {editIsConnected ? '✓' : ''}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditIsConverted(v => !v)}
                                        disabled={saving}
                                        aria-pressed={editIsConverted}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${editIsConverted ? 'text-success bg-success/10 border-success/30' : 'text-muted bg-muted/10 border-border'}`}
                                    >
                                        Converted {editIsConverted ? '✓' : ''}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-muted uppercase tracking-wider mb-1" htmlFor="enq-priority-edit">Priority</label>
                                        <select
                                            id="enq-priority-edit"
                                            value={editPriority}
                                            onChange={e => setEditPriority(e.target.value)}
                                            disabled={saving}
                                            className="w-full bg-white border border-border text-text text-sm px-2 py-1.5 focus:outline-none focus:border-accent disabled:opacity-60"
                                        >
                                            <option value="">None</option>
                                            {ENQUIRY_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-muted uppercase tracking-wider mb-1" htmlFor="enq-schedule-edit">Upcoming schedule</label>
                                        <input
                                            id="enq-schedule-edit"
                                            type="datetime-local"
                                            value={editSchedule}
                                            onChange={e => setEditSchedule(e.target.value)}
                                            disabled={saving}
                                            className="w-full bg-white border border-border text-text text-sm px-2 py-1.5 focus:outline-none focus:border-accent disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs text-muted uppercase tracking-wider mb-1" htmlFor="enq-summary-edit">Lead summary</label>
                                    <textarea
                                        id="enq-summary-edit"
                                        value={editSummary}
                                        onChange={e => setEditSummary(e.target.value)}
                                        maxLength={5000}
                                        rows={4}
                                        placeholder="Add internal notes about this lead…"
                                        disabled={saving}
                                        className="w-full bg-white border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-y disabled:opacity-60"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    {hasUnsavedChanges && !saving && (
                                        <span className="text-xs text-muted">Unsaved changes</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveChanges}
                                        disabled={saving || !hasUnsavedChanges}
                                        className="px-4 py-1.5 bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
