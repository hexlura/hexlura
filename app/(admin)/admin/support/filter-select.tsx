'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function FilterSelect({
    label, paramKey, options,
}: {
    label: string
    paramKey: string
    options: { value: string; label: string }[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const value = searchParams.get(paramKey) ?? ''

    const handleChange = (next: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (next) params.set(paramKey, next)
        else params.delete(paramKey)
        const qs = params.toString()
        router.push(qs ? `?${qs}` : '?')
    }

    return (
        <label className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="uppercase tracking-wider">{label}</span>
            <select
                value={value}
                onChange={e => handleChange(e.target.value)}
                className="bg-white border border-border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent"
            >
                <option value="">All</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </label>
    )
}
