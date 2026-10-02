'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

interface RevenueChartProps {
    data: { date: string; revenue: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-hover px-3 py-2 text-sm">
                <p className="text-muted text-xs mb-1">{label}</p>
                <p className="text-text font-semibold">£{payload[0].value.toFixed(2)}</p>
            </div>
        )
    }
    return null
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E63950" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#FF7A3D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenueLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E63950" />
                        <stop offset="100%" stopColor="#FF7A3D" />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1E7E2" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#6B5D56', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                />
                <YAxis
                    tick={{ fill: '#6B5D56', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `£${v}`}
                    width={48}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F1E7E2' }} />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="url(#revenueLine)"
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#FF7A3D', stroke: '#fff', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
