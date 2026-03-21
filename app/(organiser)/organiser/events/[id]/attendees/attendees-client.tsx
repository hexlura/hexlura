'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Attendee {
    id: string
    bookingRef: string
    name: string
    email: string
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
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

export function AttendeesClient({ eventId, eventTitle, attendees, ticketTypes }: AttendeesClientProps) {
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterCheckedIn, setFilterCheckedIn] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [showAnnouncement, setShowAnnouncement] = useState(false)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const filtered = attendees.filter(a => {
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
        const matchType = !filterType || a.ticketTypeId === filterType
        const matchCheckin = !filterCheckedIn || (filterCheckedIn === 'yes' ? a.checkedIn : !a.checkedIn)
        return matchSearch && matchType && matchCheckin
    })

    function exportCSV() {
        const headers = ['Name', 'Email', 'Ticket Type', 'Booking Ref', 'Booked Date', 'Checked In', 'Checked In Time']
        const rows = filtered.map(a => [
            a.name,
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

    return (
        <>
            <div className="bg-card border border-border rounded-none p-6">
                {/* Search + Filters */}
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                    />
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    >
                        <option value="">All ticket types</option>
                        {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select
                        value={filterCheckedIn}
                        onChange={e => setFilterCheckedIn(e.target.value)}
                        className="bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    >
                        <option value="">All attendees</option>
                        <option value="yes">Checked in</option>
                        <option value="no">Not checked in</option>
                    </select>
                    <Button variant="secondary" size="md" onClick={exportCSV}>Export CSV</Button>
                    <Button variant="primary" size="md" onClick={() => setShowAnnouncement(true)}>Send Announcement</Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-xs text-muted pb-2 font-normal pr-4">Name</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-2 font-normal pr-4">Email</th>
                            <th className="text-left text-xs text-muted pb-2 font-normal pr-4">Ticket Type</th>
                            <th className="text-left text-xs text-muted pb-2 font-normal pr-4">Booking Ref</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-2 font-normal pr-4">Booked</th>
                            <th className="text-left text-xs text-muted pb-2 font-normal pr-4">Checked In</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-8">No attendees found</td></tr>
                        )}
                        {filtered.map(a => (
                            <>
                                <tr
                                    key={a.id}
                                    className="border-b border-border/50 hover:bg-surface cursor-pointer transition-colors"
                                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                                >
                                    <td className="py-3 pr-4 text-text text-sm">{a.name}</td>
                                    <td className="hidden md:table-cell py-3 pr-4 text-muted text-xs">{a.email}</td>
                                    <td className="py-3 pr-4 text-text text-xs">{a.ticketTypeName}</td>
                                    <td className="py-3 pr-4 font-mono text-xs text-accent">{a.bookingRef}</td>
                                    <td className="hidden md:table-cell py-3 pr-4 text-muted text-xs">
                                        {new Date(a.bookedAt).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="py-3">
                                        {a.checkedIn ? (
                                            <span className="text-success text-xs font-medium">
                                                ✓ {a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        ) : (
                                            <span className="text-muted text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                                {expanded === a.id && (
                                    <tr key={`${a.id}-expanded`} className="bg-surface">
                                        <td colSpan={6} className="px-4 py-3">
                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                <div><span className="text-muted">Name:</span> <span className="text-text ml-1">{a.name}</span></div>
                                                <div><span className="text-muted">Email:</span> <span className="text-text ml-1">{a.email}</span></div>
                                                <div><span className="text-muted">Quantity:</span> <span className="text-text ml-1">{a.quantity}</span></div>
                                                <div><span className="text-muted">Ticket:</span> <span className="text-text ml-1">{a.ticketTypeName}</span></div>
                                                <div><span className="text-muted">Ref:</span> <span className="text-accent font-mono ml-1">{a.bookingRef}</span></div>
                                                <div><span className="text-muted">Check-in:</span> <span className="text-text ml-1">{a.checkedIn ? `Yes, ${a.checkedInAt ? new Date(a.checkedInAt).toLocaleString('en-GB') : ''}` : 'No'}</span></div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Announcement Modal */}
            {showAnnouncement && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 w-full max-w-lg">
                        <h2 className="font-heading text-xl text-text mb-4">SEND ANNOUNCEMENT</h2>
                        {sent ? (
                            <p className="text-success text-sm py-4 text-center">✓ Announcement sent!</p>
                        ) : (
                            <>
                                <p className="text-xs text-muted mb-4">Sending to {filtered.length} attendees</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-muted block mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                            placeholder="Email subject..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            rows={5}
                                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none"
                                            placeholder="Your message..."
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <Button variant="primary" size="md" onClick={sendAnnouncement} disabled={sending || !subject || !message}>
                                        {sending ? 'Sending...' : `Send to ${filtered.length} attendees`}
                                    </Button>
                                    <Button variant="secondary" size="md" onClick={() => setShowAnnouncement(false)}>Cancel</Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
