'use client'

import { useState } from 'react'
import {
    AreaChart,
    Area,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export interface RevenueRange {
    key: string
    label: string
    subtitle: string
    data: { date: string; revenue: number }[]
}

interface RevenueChartProps {
    ranges: RevenueRange[]
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

// Only the final point gets a marker, like the mockup's end dot
function renderEndDot(total: number) {
    return function EndDot(props: { cx?: number; cy?: number; index?: number }) {
        if (props.index !== total - 1 || props.cx === undefined || props.cy === undefined) return <g />
        return <circle cx={props.cx} cy={props.cy} r={5} fill="#FF7A3D" stroke="#fff" strokeWidth={2} />
    }
}

export function RevenueChart({ ranges }: RevenueChartProps) {
    const [active, setActive] = useState(ranges[0].key)
    const range = ranges.find(r => r.key === active) ?? ranges[0]

    return (
        <>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h2 className="text-sm font-semibold">Revenue Overview</h2>
                    <p className="text-xs text-muted mt-0.5">{range.subtitle}</p>
                </div>
                <div className="flex gap-1 bg-background rounded-lg p-1">
                    {ranges.map(r => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => setActive(r.key)}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${r.key === range.key ? 'bg-card shadow-soft' : 'text-muted'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={range.data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
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
                        {/* Axes are hidden to match the mockup; values show in the hover tooltip */}
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F1E7E2' }} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="url(#revenueLine)"
                            strokeWidth={3.5}
                            strokeLinecap="round"
                            fill="url(#revenueFill)"
                            dot={renderEndDot(range.data.length)}
                            activeDot={{ r: 5, fill: '#FF7A3D', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    )
}
