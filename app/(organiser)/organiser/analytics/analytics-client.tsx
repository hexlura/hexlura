'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPence } from '@/lib/fees'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

interface AnalyticsClientProps {
    events: { id: string; title: string; category: string; start_at: string; status: string }[]
    bookings: { id: string; event_id: string; ticket_subtotal_pence: number | null; discount_pence: number | null; created_at: string }[]
    items: { booking_id: string; quantity: number; ticket_type_id: string | null; ticket_type: { name?: string; event_id?: string } | null }[]
}

// ticket_subtotal_pence is always the pre-discount face value — net of any promo-code
// discount is what was actually attributable to the organiser as revenue.
function netTicketPence(b: { ticket_subtotal_pence: number | null; discount_pence: number | null }): number {
    return (b.ticket_subtotal_pence || 0) - (b.discount_pence || 0)
}

// Donut / legend colours, in order (design: red, orange, yellow, then more for extra categories)
const CATEGORY_COLORS = ['#E63950', '#FF7A3D', '#F5C518', '#F5A623', '#1B9C63', '#6B5D56']

type Range = '7d' | '30d' | '90d' | 'ytd' | 'all'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'ytd', label: 'This Year' },
    { value: 'all', label: 'All Time' },
]

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const JS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Whole pounds when exact (as in the design), otherwise keep the pence
function fmtMoney(pence: number) {
    return pence % 100 === 0 ? `£${(pence / 100).toLocaleString('en-GB')}` : formatPence(pence)
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card border border-border rounded-xl shadow-hover px-3 py-2 text-sm">
            {label && <p className="text-muted text-xs mb-1">{label}</p>}
            <p className="text-text font-semibold">£{payload[0].value.toFixed(2)}</p>
        </div>
    )
}

export function AnalyticsClient({ events, bookings, items }: AnalyticsClientProps) {
    const [range, setRange] = useState<Range>('30d')

    const cutoff = useMemo(() => {
        if (range === 'all') return new Date(0)
        if (range === 'ytd') return new Date(new Date().getFullYear(), 0, 1)
        const d = new Date()
        d.setDate(d.getDate() - (range === '7d' ? 7 : range === '30d' ? 30 : 90))
        return d
    }, [range])

    const filteredBookings = useMemo(() =>
        bookings.filter(b => new Date(b.created_at) >= cutoff),
        [bookings, cutoff]
    )

    const filteredItemsForBookings = useMemo(() => {
        const ids = new Set(filteredBookings.map(b => b.id))
        return items.filter(i => ids.has(i.booking_id))
    }, [filteredBookings, items])

    // Revenue over time
    const revenueData = useMemo(() => {
        let days: number
        if (range === '7d') days = 7
        else if (range === '30d') days = 30
        else if (range === '90d') days = 90
        else if (range === 'ytd') days = Math.max(1, Math.ceil((Date.now() - cutoff.getTime()) / 86400000))
        else days = 180
        const map: Record<string, number> = {}
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i)
            map[d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })] = 0
        }
        for (const b of filteredBookings) {
            const k = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            if (k in map) map[k] += netTicketPence(b) / 100
        }
        return Object.entries(map).map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }))
    }, [filteredBookings, range, cutoff])

    // Tickets by event
    const ticketsByEvent = useMemo(() => {
        const map: Record<string, { event: string; tickets: number }> = {}
        for (const item of filteredItemsForBookings) {
            const eventId = item.ticket_type?.event_id || ''
            const ev = events.find(e => e.id === eventId)
            if (!ev) continue
            if (!map[eventId]) map[eventId] = { event: ev.title, tickets: 0 }
            map[eventId].tickets += item.quantity
        }
        return Object.values(map).sort((a, b) => b.tickets - a.tickets).slice(0, 8)
    }, [filteredItemsForBookings, events])

    // Revenue by category (value in pounds)
    const byCategory = useMemo(() => {
        const map: Record<string, number> = {}
        for (const b of filteredBookings) {
            const ev = events.find(e => e.id === b.event_id)
            if (!ev) continue
            map[ev.category] = (map[ev.category] || 0) + netTicketPence(b) / 100
        }
        return Object.entries(map)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value)
    }, [filteredBookings, events])

    // By day of week (Monday first, as in the design)
    const byDayOfWeek = useMemo(() => {
        const map: Record<string, number> = Object.fromEntries(DAY_ORDER.map(d => [d, 0]))
        for (const b of filteredBookings) {
            map[JS_DAYS[new Date(b.created_at).getDay()]] += netTicketPence(b) / 100
        }
        return DAY_ORDER.map(d => ({ day: d, revenue: Number(map[d].toFixed(2)) }))
    }, [filteredBookings])

    // Summary stats
    const totalRevenue = filteredBookings.reduce((s, b) => s + netTicketPence(b), 0)
    const totalTickets = filteredItemsForBookings.reduce((s, i) => s + i.quantity, 0)
    const avgOrder = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0
    const topEvent = ticketsByEvent[0]?.event || 'N/A'

    const maxTickets = Math.max(1, ...ticketsByEvent.map(t => t.tickets))
    const categoryTotal = byCategory.reduce((s, c) => s + c.value, 0)
    const maxDay = Math.max(0, ...byDayOfWeek.map(d => d.revenue))
    // The two strongest days are highlighted in red, the rest in amber
    const topDays = new Set(
        [...byDayOfWeek].filter(d => d.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 2).map(d => d.day)
    )

    // Donut segments: circumference of r=15.9 is ~100, so lengths are plain percentages
    let cumulative = 0
    const segments = byCategory.map((c, i) => {
        const pct = categoryTotal > 0 ? (c.value / categoryTotal) * 100 : 0
        const seg = { ...c, pct, offset: -cumulative, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }
        cumulative += pct
        return seg
    })

    const kpis = [
        { label: 'Total Revenue', value: fmtMoney(totalRevenue) },
        { label: 'Avg. Order Value', value: formatPence(Math.round(avgOrder)) },
        { label: 'Total Tickets', value: totalTickets.toLocaleString('en-GB') },
        { label: 'Top Event', value: topEvent },
    ]

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">ANALYTICS</h1>
                    <p className="text-muted text-sm mt-1">Performance across all your events</p>
                </div>
                <ThemedSelect
                    value={range}
                    onChange={e => setRange(e.target.value as Range)}
                    aria-label="Date range"
                    className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                >
                    {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </ThemedSelect>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                {kpis.map(k => (
                    <div key={k.label} className="bg-card rounded-2xl shadow-card p-5 min-w-0">
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">{k.label}</p>
                        <p className="font-heading text-3xl truncate" title={k.value}>{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue over time */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <h2 className="text-sm font-semibold mb-4">Revenue Over Time</h2>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="analyticsRevFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#E63950" stopOpacity={0.22} />
                                        <stop offset="100%" stopColor="#FF7A3D" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#F1E7E2" vertical={false} />
                                <YAxis hide domain={[0, 'auto']} />
                                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#F1E7E2' }} />
                                <Area
                                    type="linear"
                                    dataKey="revenue"
                                    stroke="#E63950"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="url(#analyticsRevFill)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#E63950', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tickets by event */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <h2 className="text-sm font-semibold mb-4">Tickets Sold by Event</h2>
                    {ticketsByEvent.length === 0 ? (
                        <p className="text-muted text-xs text-center py-12">No data for period</p>
                    ) : (
                        <div className="flex flex-col gap-4 mt-2">
                            {ticketsByEvent.map(t => (
                                <div key={t.event}>
                                    <div className="flex justify-between gap-3 text-xs mb-1">
                                        <span className="font-medium truncate">{t.event}</span>
                                        <span className="text-muted shrink-0">{t.tickets.toLocaleString('en-GB')}</span>
                                    </div>
                                    <div className="h-2.5 bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-full" style={{ width: `${(t.tickets / maxTickets) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by category */}
                <div className="bg-card rounded-2xl shadow-card p-6 flex items-center gap-8">
                    {segments.length === 0 ? (
                        <p className="text-muted text-xs text-center py-8 w-full">
                            <span className="block text-sm font-semibold text-text mb-3 text-left">Revenue by Category</span>
                            No data for period
                        </p>
                    ) : (
                        <>
                            <svg width="140" height="140" viewBox="0 0 36 36" className="shrink-0">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1E7E2" strokeWidth="4" />
                                {segments.map(s => (
                                    <circle
                                        key={s.name}
                                        cx="18" cy="18" r="15.9" fill="none" stroke={s.color} strokeWidth="4"
                                        strokeDasharray={`${s.pct} ${100 - s.pct}`}
                                        strokeDashoffset={s.offset}
                                        transform="rotate(-90 18 18)"
                                    />
                                ))}
                            </svg>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold mb-3">Revenue by Category</h2>
                                <div className="flex flex-col gap-2 text-xs">
                                    {segments.map(s => (
                                        <div key={s.name} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                            <span className="truncate">{s.name} — {Math.round(s.pct)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Sales by day of week */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <h2 className="text-sm font-semibold mb-4">Sales by Day of Week</h2>
                    <div className="flex justify-between h-32 gap-2 mt-2">
                        {byDayOfWeek.map(d => (
                            <div key={d.day} className="flex-1 h-full flex flex-col items-center gap-1" title={`${d.day}: £${d.revenue.toFixed(2)}`}>
                                <div className="flex-1 w-full flex items-end">
                                    <div
                                        className={`w-full rounded-t-lg ${topDays.has(d.day) ? 'bg-accent' : 'bg-warm-amber'}`}
                                        style={{ height: `${maxDay > 0 ? Math.max(3, (d.revenue / maxDay) * 100) : 3}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-muted">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
