'use client'

import { useState, useMemo } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { formatPence } from '@/lib/fees'

interface AnalyticsClientProps {
    events: { id: string; title: string; category: string; start_at: string; status: string }[]
    bookings: { id: string; event_id: string; ticket_subtotal_pence: number | null; created_at: string }[]
    items: { booking_id: string; quantity: number; ticket_type_id: string | null; ticket_type: { name?: string; event_id?: string } | null }[]
}

const ACCENT = '#E63950'
const GOLD = '#F5A623'
const SUCCESS = '#00E5A0'
const COLORS = [ACCENT, GOLD, SUCCESS, '#8888AA', '#6060AA', '#AA6060']

type Range = '7d' | '30d' | '90d' | 'all'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card border border-border rounded-none px-3 py-2 text-xs">
            {label && <p className="text-muted mb-1">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} className="text-text">{p.name}: <span className="text-accent font-medium">{typeof p.value === 'number' && p.name?.includes('£') ? `£${p.value.toFixed(2)}` : p.value}</span></p>
            ))}
        </div>
    )
}

export function AnalyticsClient({ events, bookings, items }: AnalyticsClientProps) {
    const [range, setRange] = useState<Range>('30d')

    const cutoff = useMemo(() => {
        if (range === 'all') return new Date(0)
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
        const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180
        const map: Record<string, number> = {}
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i)
            map[d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })] = 0
        }
        for (const b of filteredBookings) {
            const k = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            if (k in map) map[k] += (b.ticket_subtotal_pence || 0) / 100
        }
        return Object.entries(map).map(([date, revenue]) => ({ date, 'Revenue (£)': Number(revenue.toFixed(2)) }))
    }, [filteredBookings, range])

    // Tickets by event
    const ticketsByEvent = useMemo(() => {
        const map: Record<string, { event: string; tickets: number }> = {}
        for (const item of filteredItemsForBookings) {
            const eventId = item.ticket_type?.event_id || ''
            const ev = events.find(e => e.id === eventId)
            if (!ev) continue
            if (!map[eventId]) map[eventId] = { event: ev.title.slice(0, 20), tickets: 0 }
            map[eventId].tickets += item.quantity
        }
        return Object.values(map).sort((a, b) => b.tickets - a.tickets).slice(0, 8)
    }, [filteredItemsForBookings, events])

    // By category
    const byCategory = useMemo(() => {
        const map: Record<string, number> = {}
        for (const b of filteredBookings) {
            const ev = events.find(e => e.id === b.event_id)
            if (!ev) continue
            map[ev.category] = (map[ev.category] || 0) + (b.ticket_subtotal_pence || 0) / 100
        }
        return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    }, [filteredBookings, events])

    // By day of week
    const byDayOfWeek = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const map: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]))
        for (const b of filteredBookings) {
            const day = days[new Date(b.created_at).getDay()]
            map[day] += (b.ticket_subtotal_pence || 0) / 100
        }
        return days.map(d => ({ day: d, 'Revenue (£)': Number(map[d].toFixed(2)) }))
    }, [filteredBookings])

    // Summary stats
    const totalRevenue = filteredBookings.reduce((s, b) => s + (b.ticket_subtotal_pence || 0), 0)
    const totalTickets = filteredItemsForBookings.reduce((s, i) => s + i.quantity, 0)
    const avgOrder = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0
    const topEvent = ticketsByEvent[0]?.event || 'N/A'

    const rangeOptions: { value: Range; label: string }[] = [
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' },
        { value: 'all', label: 'All time' },
    ]

    return (
        <>
            {/* Date range selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                {rangeOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setRange(opt.value)}
                        className={`px-4 py-2 rounded-sm text-sm transition-colors ${range === opt.value ? 'bg-accent text-white' : 'bg-card border border-border text-muted hover:text-text'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Revenue', value: formatPence(totalRevenue) },
                    { label: 'Tickets Sold', value: String(totalTickets) },
                    { label: 'Avg Order Value', value: formatPence(avgOrder) },
                    { label: 'Top Event', value: topEvent },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-none p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="font-heading text-2xl text-text">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Revenue over time */}
                <div className="bg-card border border-border rounded-none p-6 col-span-2">
                    <h2 className="text-sm font-medium text-text mb-4">Revenue Over Time</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.floor(revenueData.length / 6)} />
                            <YAxis tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} width={48} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="Revenue (£)" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets by event */}
                <div className="bg-card border border-border rounded-none p-6">
                    <h2 className="text-sm font-medium text-text mb-4">Tickets Sold by Event</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={ticketsByEvent} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="event" type="category" tick={{ fill: '#8888AA', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="tickets" fill={ACCENT} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* By category */}
                <div className="bg-card border border-border rounded-none p-6">
                    <h2 className="text-sm font-medium text-text mb-4">Revenue by Category</h2>
                    {byCategory.length === 0 ? (
                        <p className="text-muted text-xs text-center py-8">No data for period</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Sales by day of week */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-sm font-medium text-text mb-4">Sales by Day of Week</h2>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={byDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} width={48} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Revenue (£)" fill={GOLD} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    )
}
