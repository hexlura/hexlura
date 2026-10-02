import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { EventFilter } from '@/components/organiser/EventFilter'

interface PageProps {
    searchParams: { event?: string }
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmed', cls: 'text-warm-green bg-warm-green/10' },
    pending: { label: 'Pending', cls: 'text-warm-yellowText bg-warm-yellow/10' },
    cancelled: { label: 'Cancelled', cls: 'text-warm-red bg-warm-red/10' },
    refunded: { label: 'Refunded', cls: 'text-muted bg-border' },
}
const statusStyle = (s: string) =>
    STATUS_STYLES[s] || { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : '—', cls: 'text-muted bg-border' }

// "12 Sep 09:14" — UK time, as the platform operates in GBP
const fmtDateTime = (iso: string) => {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Europe/London' })
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' })
    return `${date} ${time}`
}

export default async function OrganiserBookingsPage({ searchParams }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: events } = await serviceClient
        .from('events')
        .select('id, title')
        .eq('organiser_id', organiserId)
        .order('start_at', { ascending: false })
    const eventList = (events || []) as { id: string; title: string }[]
    const eventIds = eventList.map(e => e.id)

    // Validate the requested event belongs to this organiser; ignore otherwise
    const requestedEvent = searchParams?.event
    const selectedEventId = requestedEvent && eventIds.includes(requestedEvent) ? requestedEvent : null

    let bookingsQuery = eventIds.length
        ? serviceClient
            .from('bookings')
            .select('id, booking_ref, status, is_complimentary, ticket_subtotal_pence, created_at, confirmed_at, event:events(id, title), booking_items(quantity, attendee_name)')
            .order('created_at', { ascending: false })
            .limit(100)
        : null

    if (bookingsQuery) {
        bookingsQuery = selectedEventId
            ? bookingsQuery.eq('event_id', selectedEventId)
            : bookingsQuery.in('event_id', eventIds)
    }

    const { data: bookings } = bookingsQuery ? await bookingsQuery : { data: [] }

    const rows = (bookings || []) as unknown as {
        id: string; booking_ref: string; status: string; is_complimentary: boolean | null;
        ticket_subtotal_pence: number | null;
        created_at: string; confirmed_at: string | null;
        event: { id: string; title: string } | null;
        booking_items: { quantity: number; attendee_name: string | null }[]
    }[]

    // Exact totals for the summary strip (the table itself shows the latest 100 only).
    // null = the count query failed, shown as "—" rather than a misleading 0.
    async function countBookings(status?: string): Promise<number | null> {
        if (!eventIds.length) return 0
        let q = serviceClient.from('bookings').select('id', { count: 'exact', head: true })
        q = selectedEventId ? q.eq('event_id', selectedEventId) : q.in('event_id', eventIds)
        if (status) q = q.eq('status', status)
        const { count, error } = await q
        if (error) {
            console.error('[OrganiserBookings] count failed:', status ?? 'all', error)
            return null
        }
        return count ?? 0
    }
    const [total, confirmed, pending, refunded, cancelled] = await Promise.all([
        countBookings(), countBookings('confirmed'), countBookings('pending'), countBookings('refunded'), countBookings('cancelled'),
    ])
    const show = (n: number | null) => (n === null ? '—' : n.toLocaleString())

    const summary = [
        { label: 'Confirmed', value: confirmed },
        { label: 'Pending', value: pending },
        { label: 'Refunded', value: refunded },
        { label: 'Cancelled', value: cancelled },
    ]

    const exportHref = `/api/organiser/bookings/export${selectedEventId ? `?event=${selectedEventId}` : ''}`
    const buyerOf = (b: (typeof rows)[number]) => b.booking_items.find(i => i.attendee_name)?.attendee_name || 'Guest'
    const qtyOf = (b: (typeof rows)[number]) => b.booking_items.reduce((sum, i) => sum + i.quantity, 0) || '—'

    const amountCell = (b: (typeof rows)[number]) =>
        b.is_complimentary
            ? <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full">Complimentary</span>
            : formatPence(b.ticket_subtotal_pence || 0)

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">BOOKINGS</h1>
                    <p className="text-muted text-sm mt-1">
                        {total === null ? 'Bookings' : `${total.toLocaleString()} booking${total === 1 ? '' : 's'}`}{' '}
                        {selectedEventId ? 'for this event' : 'across all events'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {eventList.length > 0 && (
                        <EventFilter events={eventList} selectedId={selectedEventId} />
                    )}
                    <a
                        href={exportHref}
                        className="bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium shadow-soft hover:shadow-hover transition-shadow flex items-center gap-2"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Export
                    </a>
                </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {summary.map(s => (
                    <div key={s.label} className="bg-card rounded-2xl shadow-card p-4">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="font-heading text-2xl">{show(s.value)}</p>
                    </div>
                ))}
            </div>

            {/* Bookings table */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {rows.length === 0 ? (
                    <p className="text-center text-muted text-sm py-16">No bookings yet</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="hidden sm:table w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                        <th className="font-medium py-3.5 px-6">Booking Ref</th>
                                        <th className="font-medium py-3.5 px-4">Buyer</th>
                                        <th className="font-medium py-3.5 px-4">Event</th>
                                        <th className="font-medium py-3.5 px-4">Status</th>
                                        <th className="font-medium py-3.5 px-4 text-right">Qty</th>
                                        <th className="font-medium py-3.5 px-4 text-right">Amount</th>
                                        <th className="font-medium py-3.5 px-6 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(b => {
                                        const st = statusStyle(b.status)
                                        return (
                                            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                                <td className="py-3.5 px-6">
                                                    <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-xs text-accent font-semibold hover:underline">
                                                        {b.booking_ref}
                                                    </Link>
                                                </td>
                                                <td className="py-3.5 px-4 font-medium">{buyerOf(b)}</td>
                                                <td className="py-3.5 px-4 text-muted truncate max-w-[160px]">{b.event?.title || '—'}</td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">{qtyOf(b)}</td>
                                                <td className="py-3.5 px-4 text-right font-medium">{amountCell(b)}</td>
                                                <td className="py-3.5 px-6 text-right text-muted text-xs whitespace-nowrap">{fmtDateTime(b.created_at)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card list (the design is desktop-only; same visual language) */}
                        <div className="block sm:hidden divide-y divide-border">
                            {rows.map(b => {
                                const st = statusStyle(b.status)
                                return (
                                    <div key={b.id} className="p-4 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-sm text-accent font-semibold hover:underline">
                                                {b.booking_ref}
                                            </Link>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                                        </div>
                                        <p className="text-sm font-medium truncate">{buyerOf(b)}</p>
                                        <p className="text-xs text-muted truncate">{b.event?.title || '—'}</p>
                                        <div className="flex items-center justify-between text-xs text-muted pt-0.5">
                                            <span>{fmtDateTime(b.created_at)} · {qtyOf(b)} ticket{qtyOf(b) === 1 ? '' : 's'}</span>
                                            <span className="text-text font-medium">{amountCell(b)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {total !== null && total > rows.length && (
                <p className="text-xs text-muted mt-3">Showing the latest {rows.length} bookings — use Export for the full list.</p>
            )}
        </div>
    )
}
