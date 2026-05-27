'use client'

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar,
} from 'recharts'

interface Props {
    gmvChartData: { date: string; revenue: number }[]
    categoryChartData: { category: string; count: number }[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-none px-3 py-2 text-sm">
                <p className="text-muted text-xs mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-text font-medium">
                        {p.name === 'count' ? p.value : `£${Number(p.value).toFixed(2)}`}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function AdminDashboardClient({ gmvChartData, categoryChartData }: Props) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-none p-6">
                <h2 className="text-sm font-medium text-text mb-1">GMV — Last 90 Days</h2>
                <p className="text-xs text-muted mb-4">Daily gross merchandise value</p>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={gmvChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#C0C0C8" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#666677', fontSize: 10 }} axisLine={false} tickLine={false} interval={14} />
                        <YAxis tick={{ fill: '#666677', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} width={48} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="revenue" stroke="#E63950" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#E63950', strokeWidth: 0 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-none p-6">
                <h2 className="text-sm font-medium text-text mb-1">Bookings by Category</h2>
                <p className="text-xs text-muted mb-4">All confirmed bookings</p>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#C0C0C8" vertical={false} />
                        <XAxis dataKey="category" tick={{ fill: '#666677', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#666677', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" fill="#E63950" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
