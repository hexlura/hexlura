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
            .select('id, booking_ref, status, is_complimentary, ticket_subtotal_pence, total_pence, created_at, confirmed_at, event:events(id, title), booking_items(quantity)')
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
        ticket_subtotal_pence: number | null; total_pence: number | null;
        created_at: string; confirmed_at: string | null;
        event: { id: string; title: string } | null;
        booking_items: { quantity: number }[]
    }[]

    const statusColors: Record<string, string> = {
        confirmed: 'text-success bg-success/10 border-success/20',
        pending: 'text-gold bg-gold/10 border-gold/20',
        cancelled: 'text-accent bg-accent/10 border-accent/20',
        refunded: 'text-muted bg-muted/10 border-muted/20',
    }

    return (
        <div className="max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">BOOKINGS</h1>
                    <p className="text-muted text-sm mt-1">{rows.length} bookings shown</p>
                </div>
                {eventList.length > 0 && (
                    <EventFilter events={eventList} selectedId={selectedEventId} />
                )}
            </div>

            <div className="bg-card border border-border rounded-none p-6">
                <div className="overflow-x-auto">
                <table className="hidden sm:table w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Booking Ref</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Event</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Status</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-3 font-normal pr-4">Subtotal</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-3 font-normal pr-4">Qty</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Total</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted text-xs py-12">No bookings yet</td></tr>
                        )}
                        {rows.map(b => (
                            <tr key={b.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 pr-4">
                                    <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-xs text-accent hover:underline">
                                        {b.booking_ref}
                                    </Link>
                                </td>
                                <td className="py-3 pr-4 text-text text-xs max-w-[160px] truncate">{b.event?.title || '—'}</td>
                                <td className="py-3 pr-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[b.status] || 'text-muted border-border'}`}>
                                        {b.status}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell py-3 pr-4 text-text text-xs">{b.is_complimentary ? '—' : formatPence(b.ticket_subtotal_pence || 0)}</td>
                                <td className="hidden md:table-cell py-3 pr-4 text-text text-xs">{b.booking_items.reduce((sum, i) => sum + i.quantity, 0) || '—'}</td>
                                <td className="py-3 pr-4 text-xs font-medium">
                                    {b.is_complimentary
                                        ? <span className="text-xs px-2 py-0.5 rounded-full border text-success bg-success/10 border-success/20">Complimentary</span>
                                        : <span className="text-text">{formatPence(b.total_pence || 0)}</span>
                                    }
                                </td>
                                <td className="py-3 text-muted text-xs">
                                    {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Mobile card list */}
                <div className="block sm:hidden divide-y divide-border">
                    {rows.length === 0 && (
                        <p className="text-center text-muted text-xs py-12">No bookings yet</p>
                    )}
                    {rows.map(b => (
                        <div key={b.id} className="py-4 space-y-2">
                            <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-sm text-accent hover:underline block">
                                {b.booking_ref}
                            </Link>
                            <p className="text-text text-sm font-medium truncate">{b.event?.title || '—'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[b.status] || 'text-muted border-border'}`}>
                                {b.status}
                            </span>
                            <div className="flex items-center gap-4 text-xs text-muted pt-1">
                                <span>{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                {b.is_complimentary
                                    ? <span className="text-xs px-2 py-0.5 rounded-full border text-success bg-success/10 border-success/20">Complimentary</span>
                                    : <span className="text-text font-medium">{formatPence(b.total_pence || 0)}</span>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
