'use client'

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, AreaChart, Area,
} from 'recharts'

interface Props {
    monthlyData: { month: string; gmv: number; revenue: number; payouts: number; bookings_count: number }[]
    cumulativeData: { month: string; cumulative: number }[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
                <p className="text-muted mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="font-medium">
                        {p.name}: £{Number(p.value).toFixed(2)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function FinancialsClient({ monthlyData, cumulativeData }: Props) {
    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-sm font-medium text-text mb-1">GMV vs Platform Revenue</h2>
                <p className="text-xs text-muted mb-4">Last 12 months</p>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: '#8888AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8888AA', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} width={48} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#8888AA' }} />
                        <Bar dataKey="gmv" name="GMV" fill="#E63950" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="revenue" name="Revenue" fill="#F5A623" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-sm font-medium text-text mb-1">Cumulative GMV</h2>
                <p className="text-xs text-muted mb-4">All time</p>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E63950" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#E63950" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: '#8888AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8888AA', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} width={48} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="cumulative" name="Cumulative GMV" stroke="#E63950" strokeWidth={2} fill="url(#gmvGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
