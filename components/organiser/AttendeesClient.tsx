'use client'

import { useState } from 'react'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

interface Attendee {
    id: string
    bookingRef: string
    name: string
    email: string
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
    ticketIndex: number
    totalInGroup: number
    bookedAt: string
    checkedIn: boolean
    checkedInAt: string | null
}

interface AttendeesClientProps {
    eventId: string
    eventTitle: string
    attendees: Attendee[]
    ticketTypes: { id: string; name: string }[]
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export function AttendeesClient({ eventId, eventTitle, attendees, ticketTypes }: AttendeesClientProps) {
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterCheckedIn, setFilterCheckedIn] = useState('')
    const [showAnnouncement, setShowAnnouncement] = useState(false)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [localAttendees, setLocalAttendees] = useState(attendees)
    const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set())

    async function handleManualCheckin(attendee: Attendee) {
        if (attendee.checkedIn || checkingIn.has(attendee.id)) return
        setCheckingIn(prev => new Set(prev).add(attendee.id))
        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_item_id: attendee.id, event_id: eventId }),
            })
            const data = await res.json()
            if (data.success) {
                setLocalAttendees(prev => prev.map(a =>
                    a.id === attendee.id ? { ...a, checkedIn: true, checkedInAt: new Date().toISOString() } : a
                ))
            } else {
                alert(data.message || 'Check-in failed')
            }
        } catch {
            alert('Check-in failed — please try again')
        } finally {
            setCheckingIn(prev => { const s = new Set(prev); s.delete(attendee.id); return s })
        }
    }

    const filtered = localAttendees.filter(a => {
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
        const matchType = !filterType || a.ticketTypeId === filterType
        const matchCheckin = !filterCheckedIn || (filterCheckedIn === 'yes' ? a.checkedIn : !a.checkedIn)
        return matchSearch && matchType && matchCheckin
    })

    function exportCSV() {
        const headers = ['Name', 'Email', 'Ticket Type', 'Booking Ref', 'Booked Date', 'Checked In', 'Checked In Time']
        const rows = filtered.map(a => [
            a.totalInGroup > 1 ? `${a.name} (${a.ticketIndex}/${a.totalInGroup})` : a.name,
            a.email,
            a.ticketTypeName,
            a.bookingRef,
            new Date(a.bookedAt).toLocaleDateString('en-GB'),
            a.checkedIn ? 'Yes' : 'No',
            a.checkedInAt ? new Date(a.checkedInAt).toLocaleString('en-GB') : '',
        ])
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${eventTitle.replace(/\s+/g, '-')}-attendees.csv`; a.click()
        URL.revokeObjectURL(url)
    }

    async function sendAnnouncement() {
        setSending(true)
        try {
            await fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, subject, message }),
            })
            setSent(true)
            setTimeout(() => { setShowAnnouncement(false); setSent(false); setSubject(''); setMessage('') }, 2000)
        } finally {
            setSending(false)
        }
    }

    const closeModal = () => setShowAnnouncement(false)
    const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

    return (
        <>
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                    />
                </div>
                <ThemedSelect
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    aria-label="Filter by ticket type"
                    className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                    <option value="">All Ticket Types</option>
                    {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </ThemedSelect>
                <ThemedSelect
                    value={filterCheckedIn}
                    onChange={e => setFilterCheckedIn(e.target.value)}
                    aria-label="Filter by check-in status"
                    className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                    <option value="">All</option>
                    <option value="yes">Checked In</option>
                    <option value="no">Not Checked In</option>
                </ThemedSelect>
                <button
                    type="button"
                    onClick={exportCSV}
                    className="bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-background transition-colors whitespace-nowrap"
                >
                    Export CSV
                </button>
                <button
                    type="button"
                    onClick={() => setShowAnnouncement(true)}
                    className="bg-text text-white px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
                >
                    Send Announcement
                </button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="text-center text-muted text-sm py-12">No attendees found</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="hidden sm:table w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                        <th className="font-medium py-3.5 px-6">Attendee</th>
                                        <th className="font-medium py-3.5 px-4">Email</th>
                                        <th className="font-medium py-3.5 px-4">Ticket Type</th>
                                        <th className="font-medium py-3.5 px-4">Booking Ref</th>
                                        <th className="font-medium py-3.5 px-4 text-right">Check-in</th>
                                        <th className="font-medium py-3.5 px-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(a => (
                                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                            <td className="py-3.5 px-6 font-medium">
                                                {a.name}
                                                {a.totalInGroup > 1 && (
                                                    <span className="text-muted text-xs font-normal ml-1">({a.ticketIndex}/{a.totalInGroup})</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted text-xs">{a.email}</td>
                                            <td className="py-3.5 px-4">{a.ticketTypeName}</td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-accent">{a.bookingRef}</td>
                                            <td className="py-3.5 px-4 text-right">
                                                {a.checkedIn ? (
                                                    <span
                                                        title={a.checkedInAt ? `Checked in at ${fmtTime(a.checkedInAt)}` : undefined}
                                                        className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full"
                                                    >
                                                        Checked in
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-muted bg-border px-2.5 py-1 rounded-full">Not arrived</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-6 text-right text-xs">
                                                {a.checkedIn ? (
                                                    <span className="text-muted">—</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleManualCheckin(a)}
                                                        disabled={checkingIn.has(a.id)}
                                                        className="text-accent font-semibold hover:underline whitespace-nowrap"
                                                    >
                                                        {checkingIn.has(a.id) ? 'Checking in…' : 'Check In'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card list (the design is desktop-only; same visual language) */}
                        <div className="block sm:hidden divide-y divide-border">
                            {filtered.map(a => (
                                <div key={a.id} className="p-4 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium">
                                            {a.name}
                                            {a.totalInGroup > 1 && (
                                                <span className="text-muted text-xs font-normal ml-1">({a.ticketIndex}/{a.totalInGroup})</span>
                                            )}
                                        </p>
                                        {a.checkedIn ? (
                                            <span className="text-[11px] font-semibold text-warm-green bg-warm-green/10 px-2 py-0.5 rounded-full">
                                                Checked in{a.checkedInAt ? ` ${fmtTime(a.checkedInAt)}` : ''}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-semibold text-muted bg-border px-2 py-0.5 rounded-full">Not arrived</span>
                                        )}
                                    </div>
                                    <p className="text-muted text-xs">{a.ticketTypeName}</p>
                                    <p className="font-mono text-xs text-accent">{a.bookingRef}</p>
                                    {!a.checkedIn && (
                                        <button
                                            type="button"
                                            onClick={() => handleManualCheckin(a)}
                                            disabled={checkingIn.has(a.id)}
                                            className="text-xs text-accent font-semibold hover:underline pt-1"
                                        >
                                            {checkingIn.has(a.id) ? 'Checking in…' : 'Check In'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Send Announcement modal */}
            {showAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={closeModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">SEND ANNOUNCEMENT</h2>
                                <p className="text-muted text-xs mt-0.5">Sending to {filtered.length} attendee{filtered.length === 1 ? '' : 's'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                aria-label="Close"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-text transition-colors shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {sent ? (
                            <p className="text-warm-green text-sm font-medium py-10 text-center">✓ Announcement sent!</p>
                        ) : (
                            <>
                                <div className="p-6 flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            placeholder="Email subject..."
                                            className={modalInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1.5">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            rows={5}
                                            placeholder="Your message..."
                                            className={modalInput}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={sendAnnouncement}
                                        disabled={sending || !subject || !message}
                                        className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
                                    >
                                        {sending ? 'Sending...' : `Send to ${filtered.length} attendee${filtered.length === 1 ? '' : 's'}`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
