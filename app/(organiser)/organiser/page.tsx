import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { RevenueChart } from '@/components/organiser/RevenueChart'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { generatePayoutsForOrganiser } from '@/lib/generate-payouts'
import { EventFilter } from '@/components/organiser/EventFilter'
import { ProfileLinkButton } from '@/components/organiser/ProfileLinkButton'

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface PageProps {
    searchParams: { event?: string }
}

export default async function OrganiserDashboardPage({ searchParams }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    // Fetch org_name for display
    let orgName = 'Your Organisation'
    let slug = 'your-organisation'
    try {
        const { data } = await serviceClient
            .from('organiser_profiles')
            .select('org_name, slug')
            .eq('id', organiserId)
            .single()
        if (data) orgName = data.org_name
        if (data) slug = data.slug
    } catch (e) {
        console.error('[OrganiserDashboard] organiser_profiles fetch failed:', e)
    }

    let events: {
        id: string; title: string; start_at: string; end_at: string | null; venue_name: string | null; status: string;
        ticket_types: { quantity_total: number; quantity_sold: number }[]
    }[] = []
    try {
        if (organiserId) {
            const { data } = await serviceClient
                .from('events')
                .select('id, title, start_at, end_at, venue_name, status, ticket_types(quantity_total, quantity_sold)')
                .eq('organiser_id', organiserId)
            events = (data || []) as typeof events
        }
    } catch (e) {
        console.error('[OrganiserDashboard] events fetch failed:', e)
    }

    const eventIds = events.map(e => e.id)

    let bookings: {
        id: string; booking_ref: string; ticket_subtotal_pence: number | null; discount_pence: number | null; event_id: string;
        created_at: string; event: { title?: string } | null
    }[] = []
    try {
        if (eventIds.length > 0) {
            const { data } = await serviceClient
                .from('bookings')
                .select('id, booking_ref, ticket_subtotal_pence, discount_pence, event_id, created_at, event:events(title)')
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
    let paidOutPence = 0
    try {
        if (organiserId) {
            const { data: pendingData } = await serviceClient
                .from('payouts')
                .select('net_pence, scheduled_at')
                .eq('organiser_id', organiserId)
                .eq('status', 'pending')
            pendingPayouts = (pendingData || []) as typeof pendingPayouts

            const { data: paidData } = await serviceClient
                .from('payouts')
                .select('net_pence')
                .eq('organiser_id', organiserId)
                .eq('status', 'paid')
            paidOutPence = (paidData || []).reduce((s, p) => s + (p.net_pence || 0), 0)
        }
    } catch (e) {
        console.error('[OrganiserDashboard] payouts fetch failed:', e)
    }

    // Net of any promo-code discount — ticket_subtotal_pence is always the pre-discount
    // face value, so revenue/payout figures must subtract discount_pence to reflect what
    // was actually collected (and what the organiser is actually owed).
    const netTicketPence = (b: { ticket_subtotal_pence: number | null; discount_pence: number | null }) =>
        (b.ticket_subtotal_pence || 0) - (b.discount_pence || 0)

    const totalRevenuePence = bookings.reduce((s, b) => s + netTicketPence(b), 0)
    const totalTicketsSold = items.reduce((s, i) => s + i.quantity, 0)

    // Current Balance = everything earned minus what has already been paid out to the organiser
    const currentBalancePence = totalRevenuePence - paidOutPence

    const now = new Date().toISOString()
    const upcoming = events
        .filter(e => e.status === 'published' && e.start_at > now)
        .sort((a, b) => a.start_at.localeCompare(b.start_at))

    // "Current" tickets = tickets sold for events that haven't ended yet
    // (active or upcoming). Matches the home-page definition of an active event.
    const currentEventIds = new Set(
        events.filter(e => !e.end_at || e.end_at >= now).map(e => e.id),
    )
    const currentBookingIds = new Set(
        bookings.filter(b => currentEventIds.has(b.event_id)).map(b => b.id),
    )
    const currentTicketsSold = items
        .filter(i => currentBookingIds.has(i.booking_id))
        .reduce((s, i) => s + i.quantity, 0)

    const payoutPence = pendingPayouts.reduce((s, p) => s + (p.net_pence || 0), 0)

    const chartMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        chartMap[d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })] = 0
    }
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    for (const b of bookings.filter(b => new Date(b.created_at) >= cutoff)) {
        const k = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        if (k in chartMap) chartMap[k] += netTicketPence(b) / 100
    }
    const chartData = Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue }))

    const buyerByBooking: Record<string, string> = {}
    for (const it of items) {
        if (!buyerByBooking[it.booking_id]) buyerByBooking[it.booking_id] = it.attendee_name || 'Guest'
    }

    // Recent Bookings widget event filter — only filters this widget, not KPIs.
    // Validate the requested event belongs to this organiser before applying.
    const eventOptions = events
        .map(e => ({ id: e.id, title: e.title, start_at: e.start_at }))
        .sort((a, b) => b.start_at.localeCompare(a.start_at))
    const requestedEvent = searchParams?.event
    const selectedEventId = requestedEvent && eventIds.includes(requestedEvent) ? requestedEvent : null
    const recentBookings = selectedEventId
        ? bookings.filter(b => b.event_id === selectedEventId)
        : bookings

    type Kpi =
        | { kind: 'single'; label: string; value: string; sub: string; icon: React.ReactNode; chip: string; spark?: string }
        | { kind: 'split'; label: string; primary: { value: string; sub: string }; secondary: { value: string; sub: string }; icon: React.ReactNode; chip: string }

    const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const

    // Sparkline for the revenue card, built from the same 30-day series as the chart
    const maxRev = Math.max(...chartData.map(d => d.revenue), 0)
    const sparkPoints = maxRev > 0
        ? chartData.map((d, i) => `${Math.round((i / (chartData.length - 1)) * 100)},${(26 - (d.revenue / maxRev) * 24).toFixed(1)}`).join(' ')
        : undefined

    const kpis: Kpi[] = [
        {
            kind: 'single', label: 'Total Revenue', value: formatPence(totalRevenuePence), sub: 'All confirmed bookings',
            chip: 'bg-warm-red/10 text-warm-red', spark: sparkPoints,
            icon: <svg {...iconProps}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
        },
        {
            kind: 'single', label: 'Current Balance', value: formatPence(currentBalancePence), sub: 'Earnings pending payout',
            chip: 'bg-warm-amber/10 text-warm-amberText',
            icon: <svg {...iconProps}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg>,
        },
        {
            kind: 'split', label: 'Tickets Sold',
            primary: { value: currentTicketsSold.toLocaleString(), sub: 'Current' },
            secondary: { value: totalTicketsSold.toLocaleString(), sub: 'All time' },
            chip: 'bg-warm-orange/10 text-warm-orangeText',
            icon: <svg {...iconProps}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /></svg>,
        },
        {
            kind: 'single', label: 'Upcoming Events', value: String(upcoming.length),
            sub: upcoming[0] ? 'Next: ' + fmt(upcoming[0].start_at) : 'None scheduled',
            chip: 'bg-warm-yellow/10 text-warm-yellowText',
            icon: <svg {...iconProps}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>,
        },
        {
            kind: 'single', label: 'Payout Balance', value: formatPence(payoutPence),
            sub: payoutPence > 0 ? 'Available for withdrawal' : 'Released after event cooldown',
            chip: 'bg-warm-green/10 text-warm-green',
            icon: <svg {...iconProps}><path d="M12 2v13M6 9l6 6 6-6" /><path d="M4 19h16" /></svg>,
        },
    ]

    const avatarGradients = [
        'from-accent to-warm-orange',
        'from-warm-yellow to-warm-orange',
        'from-warm-orange to-accent',
        'from-warm-green to-warm-amber',
    ]
    const initialsOf = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean)
        if (parts.length === 0) return '?'
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div className='flex flex-col'>
                    <h1 className="font-heading text-4xl text-text tracking-wide">DASHBOARD</h1>
                    <p className="text-muted text-sm mt-1">{orgName}</p>
                </div>
                {/* Link Button and copy url button of organiser page */}
                <div className='flex items-center gap-2'>
                    <ProfileLinkButton slug={slug} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-6">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-card rounded-2xl shadow-card p-5 hover:shadow-hover transition-shadow">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${kpi.chip}`}>
                            {kpi.icon}
                        </span>
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</p>
                        {kpi.kind === 'single' ? (
                            <>
                                <p className="font-heading text-3xl text-text">{kpi.value}</p>
                                <p className="text-xs text-muted mt-2">{kpi.sub}</p>
                                {kpi.spark && (
                                    <svg viewBox="0 0 100 28" className="w-full h-7 mt-2" preserveAspectRatio="none">
                                        <polyline fill="none" stroke="#E63950" strokeWidth="2" points={kpi.spark} />
                                    </svg>
                                )}
                            </>
                        ) : (
                            <div className="flex items-baseline justify-between gap-3">
                                <div>
                                    <p className="font-heading text-3xl text-text">{kpi.primary.value}</p>
                                    <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">{kpi.primary.sub}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-heading text-xl text-muted">{kpi.secondary.value}</p>
                                    <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">{kpi.secondary.sub}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-card rounded-2xl shadow-card p-6 mb-6">
                <h2 className="text-sm font-semibold text-text">Revenue — Last 30 Days</h2>
                <p className="text-xs text-muted mt-0.5 mb-4">Daily ticket revenue</p>
                <RevenueChart data={chartData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card rounded-2xl shadow-card p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text">Recent Bookings</h2>
                        <div className="flex items-center gap-4">
                            {eventOptions.length > 0 && (
                                <EventFilter events={eventOptions} selectedId={selectedEventId} />
                            )}
                            <Link
                                href={selectedEventId ? `/organiser/bookings?event=${selectedEventId}` : '/organiser/bookings'}
                                className="text-xs font-medium text-accent hover:underline"
                            >
                                View all →
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-col divide-y divide-border">
                        {recentBookings.length === 0 && (
                            <p className="text-center text-muted text-xs py-8">
                                {selectedEventId ? 'No bookings for this event yet' : 'No bookings yet'}
                            </p>
                        )}
                        {recentBookings.slice(0, 10).map((b, i) => {
                            const buyer = buyerByBooking[b.id] || 'Guest'
                            return (
                                <Link
                                    key={b.id}
                                    href={`/organiser/bookings/${b.booking_ref}`}
                                    className="flex items-center gap-3 py-3 hover:bg-background transition-colors"
                                >
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                        {initialsOf(buyer)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{buyer}</p>
                                        <p className="text-xs text-muted truncate">
                                            {b.event?.title || '—'} · <span className="font-mono">{b.booking_ref}</span>
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold">{formatPence(netTicketPence(b))}</p>
                                        <p className="text-[11px] text-muted">{fmtShort(b.created_at)}</p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-card rounded-2xl shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text">Upcoming Events</h2>
                        <Link href="/organiser/events" className="text-xs font-medium text-accent hover:underline">View all →</Link>
                    </div>
                    <div className="flex flex-col gap-5">
                        {upcoming.length === 0 && (
                            <p className="text-muted text-xs text-center py-6">No upcoming events</p>
                        )}
                        {upcoming.slice(0, 5).map(e => {
                            const cap = e.ticket_types.reduce((s, t) => s + t.quantity_total, 0)
                            const sold = e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0)
                            const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0
                            return (
                                <div key={e.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold truncate">{e.title}</p>
                                        {cap > 0 && (
                                            <span className="text-[10px] font-semibold text-warm-red bg-warm-red/10 px-2 py-0.5 rounded-full shrink-0">{pct}%</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted mt-0.5">{fmt(e.start_at)}{e.venue_name ? ' · ' + e.venue_name : ''}</p>
                                    {cap > 0 && (
                                        <div className="mt-3">
                                            <div className="h-2 bg-background rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-full" style={{ width: pct + '%' }} />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-muted mt-1"><span>{sold} sold</span><span>{cap} cap</span></div>
                                        </div>
                                    )}
                                    <Link href={`/organiser/events/${e.id}`} className="text-xs font-medium text-accent hover:underline mt-2 inline-block">Manage →</Link>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
