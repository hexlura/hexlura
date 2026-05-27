'use client'

import {
    LineChart,
    Line,
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
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
                <p className="text-muted text-xs mb-1">{label}</p>
                <p className="text-text font-medium">£{payload[0].value.toFixed(2)}</p>
            </div>
        )
    }
    return null
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#8888AA', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                />
                <YAxis
                    tick={{ fill: '#8888AA', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `£${v}`}
                    width={48}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#E63950"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#E63950', strokeWidth: 0 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
