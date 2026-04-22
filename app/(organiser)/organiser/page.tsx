import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { RevenueChart } from '@/components/organiser/RevenueChart'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { generatePayoutsForOrganiser } from '@/lib/generate-payouts'

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default async function OrganiserDashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    // Fetch org_name for display
    let orgName = 'Your Organisation'
    try {
        const { data } = await serviceClient
            .from('organiser_profiles')
            .select('org_name')
            .eq('id', organiserId)
            .single()
        if (data) orgName = data.org_name
    } catch (e) {
        console.error('[OrganiserDashboard] organiser_profiles fetch failed:', e)
    }

    let events: {
        id: string; title: string; start_at: string; venue_name: string | null; status: string;
        ticket_types: { quantity_total: number; quantity_sold: number }[]
    }[] = []
    try {
        if (organiserId) {
            const { data } = await serviceClient
                .from('events')
                .select('id, title, start_at, venue_name, status, ticket_types(quantity_total, quantity_sold)')
                .eq('organiser_id', organiserId)
            events = (data || []) as typeof events
        }
    } catch (e) {
        console.error('[OrganiserDashboard] events fetch failed:', e)
    }

    const eventIds = events.map(e => e.id)

    let bookings: {
        id: string; booking_ref: string; ticket_subtotal_pence: number | null;
        created_at: string; event: { title?: string } | null
    }[] = []
    try {
        if (eventIds.length > 0) {
            const { data } = await serviceClient
                .from('bookings')
                .select('id, booking_ref, ticket_subtotal_pence, created_at, event:events(title)')
                .in('event_id', eventIds)
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })
            bookings = (data || []) as typeof bookings
        }
    } catch (e) {
        console.error('[OrganiserDashboard] bookings fetch failed:', e)
    }

    const bookingIds = bookings.map(b => b.id)

    let items: { booking_id: string; quantity: number; attendee_name: string | null }[] = []
    try {
        if (bookingIds.length > 0) {
            const { data } = await serviceClient
                .from('booking_items')
                .select('booking_id, quantity, attendee_name')
                .in('booking_id', bookingIds)
            items = (data || []) as typeof items
        }
    } catch (e) {
        console.error('[OrganiserDashboard] booking_items fetch failed:', e)
    }

    // Auto-generate payout records for completed events
    await generatePayoutsForOrganiser(organiserId)

    let pendingPayouts: { net_pence: number | null; scheduled_at: string | null }[] = []
    try {
        if (organiserId) {
            const { data } = await serviceClient
                .from('payouts')
                .select('net_pence, scheduled_at')
                .eq('organiser_id', organiserId)
                .eq('status', 'pending')
            pendingPayouts = (data || []) as typeof pendingPayouts
        }
    } catch (e) {
        console.error('[OrganiserDashboard] payouts fetch failed:', e)
    }

    const totalRevenuePence = bookings.reduce((s, b) => s + (b.ticket_subtotal_pence || 0), 0)
    const totalTicketsSold = items.reduce((s, i) => s + i.quantity, 0)

    const now = new Date().toISOString()
    const upcoming = events
        .filter(e => e.status === 'published' && e.start_at > now)
        .sort((a, b) => a.start_at.localeCompare(b.start_at))

    const payoutPence = pendingPayouts.reduce((s, p) => s + (p.net_pence || 0), 0)

    const chartMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        chartMap[d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })] = 0
    }
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    for (const b of bookings.filter(b => new Date(b.created_at) >= cutoff)) {
        const k = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        if (k in chartMap) chartMap[k] += (b.ticket_subtotal_pence || 0) / 100
    }
    const chartData = Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue }))

    const buyerByBooking: Record<string, string> = {}
    for (const it of items) {
        if (!buyerByBooking[it.booking_id]) buyerByBooking[it.booking_id] = it.attendee_name || 'Guest'
    }

    const kpis = [
        { label: 'Total Revenue', value: formatPence(totalRevenuePence), sub: 'All confirmed bookings' },
        { label: 'Tickets Sold', value: totalTicketsSold.toLocaleString(), sub: 'All time' },
        { label: 'Upcoming Events', value: String(upcoming.length), sub: upcoming[0] ? 'Next: ' + fmt(upcoming[0].start_at) : 'None scheduled' },
        { label: 'Payout Balance', value: formatPence(payoutPence), sub: payoutPence > 0 ? 'Available for withdrawal' : 'Released after event cooldown' },
    ]

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">DASHBOARD</h1>
                <p className="text-muted text-sm mt-1">{orgName}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-card border border-border rounded-none p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className="font-heading text-3xl text-text">{kpi.value}</p>
                        <p className="text-xs text-muted mt-2">{kpi.sub}</p>
                    </div>
                ))}
            </div>
            <div className="bg-card border border-border rounded-none p-6 mb-8">
                <h2 className="text-sm font-medium text-text mb-1">Revenue — Last 30 Days</h2>
                <p className="text-xs text-muted mb-4">Daily ticket revenue</p>
                <RevenueChart data={chartData} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-card border border-border rounded-none p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-text">Recent Bookings</h2>
                        <Link href="/organiser/bookings" className="text-xs text-accent hover:underline">View all →</Link>
                    </div>
                    <table className="w-full">
                        <thead><tr className="border-b border-border">
                            {['Ref', 'Buyer', 'Event', 'Amount', 'Date'].map((h, idx) => (
                                <th key={h} className={`text-xs text-muted pb-2 font-normal ${idx >= 3 ? 'text-right' : 'text-left'} ${idx > 0 ? 'pl-3' : ''}`}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {bookings.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted text-xs py-8">No bookings yet</td></tr>
                            )}
                            {bookings.slice(0, 10).map(b => (
                                <tr key={b.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-2.5">
                                        <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-xs text-accent hover:underline">{b.booking_ref}</Link>
                                    </td>
                                    <td className="py-2.5 pl-3 text-text text-xs">{buyerByBooking[b.id] || 'Guest'}</td>
                                    <td className="py-2.5 pl-3 text-text text-xs max-w-[120px] truncate">{b.event?.title || '—'}</td>
                                    <td className="py-2.5 pl-3 text-right text-text text-xs">{formatPence(b.ticket_subtotal_pence || 0)}</td>
                                    <td className="py-2.5 pl-3 text-right text-muted text-xs">{fmtShort(b.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-card border border-border rounded-none p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-text">Upcoming Events</h2>
                        <Link href="/organiser/events" className="text-xs text-accent hover:underline">View all →</Link>
                    </div>
                    <div className="flex flex-col gap-4">
                        {upcoming.length === 0 && (
                            <p className="text-muted text-xs text-center py-6">No upcoming events</p>
                        )}
                        {upcoming.slice(0, 5).map(e => {
                            const cap = e.ticket_types.reduce((s, t) => s + t.quantity_total, 0)
                            const sold = e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0)
                            const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0
                            return (
                                <div key={e.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                    <p className="text-sm text-text font-medium truncate">{e.title}</p>
                                    <p className="text-xs text-muted mt-0.5">{fmt(e.start_at)}{e.venue_name ? ' · ' + e.venue_name : ''}</p>
                                    {cap > 0 && (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-muted mb-1"><span>{sold}/{cap}</span><span>{pct}%</span></div>
                                            <div className="h-1.5 bg-border rounded-none overflow-hidden">
                                                <div className="h-full bg-accent rounded-full" style={{ width: pct + '%' }} />
                                            </div>
                                        </div>
                                    )}
                                    <Link href={`/organiser/events/${e.id}`} className="text-xs text-accent hover:underline mt-1.5 inline-block">Manage →</Link>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
