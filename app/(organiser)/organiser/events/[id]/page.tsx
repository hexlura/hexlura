import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { loadEventAttendees } from '@/lib/organiser-attendees'
import { NotifyFollowersButton } from '@/components/organiser/NotifyFollowersButton'
import { EventQuickLinks } from '@/components/organiser/EventQuickLinks'

interface EventPageProps {
    params: { id: string }
}

const TZ = 'Europe/London'

export default async function EventOverviewPage({ params }: EventPageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    // Ownership is enforced here: the event must belong to this organiser
    const { data: event, error: eventErr } = await serviceClient
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('organiser_id', organiserId)
        .maybeSingle()
    if (eventErr) throw eventErr
    if (!event) notFound()

    const { data: ticketTypes, error: ttErr } = await serviceClient
        .from('ticket_types')
        .select('id, name, price_pence, quantity_total, sort_order')
        .eq('event_id', params.id)
        .order('sort_order')
    if (ttErr) throw ttErr

    // Sales, revenue (net of promo discounts) and check-ins — same source as the Attendees page
    const stats = await loadEventAttendees(params.id, organiserId)
    const attendees = stats?.attendees ?? []
    const sold = stats?.totalTickets ?? 0
    const checkedIn = stats?.checkedIn ?? 0
    const revenuePence = stats?.totalRevenuePence ?? 0

    const types = (ticketTypes || []) as { id: string; name: string; price_pence: number; quantity_total: number }[]
    const capacity = types.reduce((s, t) => s + (t.quantity_total || 0), 0)
    const soldByType: Record<string, number> = {}
    for (const a of attendees) soldByType[a.ticketTypeId] = (soldByType[a.ticketTypeId] || 0) + 1

    const now = Date.now()
    const start = new Date(event.start_at)
    const ended = start.getTime() < now
    const daysUntil = Math.ceil((start.getTime() - now) / 86400000)

    const statusText =
        event.status === 'published' && ended ? 'Ended'
            : event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Draft'

    const dateStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
    const timeOf = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
    const doors = event.checkin_start_at ? `Doors ${timeOf(event.checkin_start_at)}` : `Starts ${timeOf(event.start_at)}`
    const subtitle = [dateStr, event.venue_city, doors].filter(Boolean).join(' · ')

    // Whole pounds when exact (as in the design), otherwise keep the pence
    const revenueLabel = revenuePence % 100 === 0
        ? `£${(revenuePence / 100).toLocaleString('en-GB')}`
        : formatPence(revenuePence)

    const isPublished = event.status === 'published'

    return (
        <div className="max-w-7xl">
            <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Events
            </Link>

            {/* Hero header */}
            <div className="bg-gradient-to-br from-accent to-warm-orange rounded-2xl shadow-glow p-6 sm:p-8 mb-6 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">{statusText}</span>
                        <h1 className="font-heading text-4xl tracking-wide mt-3 uppercase break-words">{event.title}</h1>
                        <p className="text-sm opacity-90 mt-1">{subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                        <Link href={`/organiser/events/${params.id}/edit`} className="bg-white text-text px-4 py-2.5 rounded-xl text-xs font-semibold">
                            Edit Details
                        </Link>
                        {isPublished && (
                            <NotifyFollowersButton variant="hero" eventId={event.id} initialNotifiedAt={event.followers_notified_at ?? null} />
                        )}
                        {isPublished && event.slug && (
                            <a
                                href={`/events/${event.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/30 hover:bg-white/25 transition-colors"
                            >
                                View Public Page
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div className="bg-card rounded-2xl shadow-card p-5">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Tickets Sold</p>
                    <p className="font-heading text-3xl">
                        {sold.toLocaleString()}{capacity > 0 && <span className="text-lg text-muted"> / {capacity.toLocaleString()}</span>}
                    </p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-5">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Revenue</p>
                    <p className="font-heading text-3xl">{revenueLabel}</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-5">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Checked In</p>
                    <p className="font-heading text-3xl">
                        {checkedIn.toLocaleString()} <span className="text-lg text-muted">/ {sold.toLocaleString()}</span>
                    </p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-5">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Days Until Event</p>
                    <p className={`font-heading text-3xl ${ended ? 'text-muted' : 'text-accent'}`}>
                        {ended ? 'Ended' : daysUntil <= 0 ? 'Today' : daysUntil}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Ticket types */}
                <div className="lg:col-span-2 bg-card rounded-2xl shadow-card p-6 self-start">
                    <h2 className="text-sm font-semibold mb-4">Ticket Types</h2>
                    {types.length === 0 ? (
                        <p className="text-sm text-muted">No ticket types yet.</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {types.map(t => {
                                const n = soldByType[t.id] || 0
                                const pct = t.quantity_total > 0 ? Math.min(100, Math.round((n / t.quantity_total) * 100)) : 0
                                return (
                                    <div key={t.id}>
                                        <div className="flex justify-between items-center gap-3 mb-1.5">
                                            <p className="text-sm font-medium truncate">{t.name} — {formatPence(t.price_pence)}</p>
                                            <span className="text-xs text-muted shrink-0">{n.toLocaleString()} / {t.quantity_total.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-background rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Quick links */}
                <EventQuickLinks eventId={event.id} status={event.status} />
            </div>
        </div>
    )
}
