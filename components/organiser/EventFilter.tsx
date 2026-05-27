'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface EventFilterProps {
    events: { id: string; title: string }[]
    selectedId: string | null
    basePath?: string
    label?: string
    /**
     * Extra query params to preserve when changing the event filter.
     * Pass them flat — keys with empty/null values will be dropped.
     */
    extraParams?: Record<string, string | null | undefined>
}

export function EventFilter({ events, selectedId, basePath, label = 'Event', extraParams }: EventFilterProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()
    const target = basePath ?? pathname

    const handleChange = (eventId: string) => {
        const params = new URLSearchParams()
        if (eventId) params.set('event', eventId)
        if (extraParams) {
            for (const [k, v] of Object.entries(extraParams)) {
                if (v) params.set(k, v)
            }
        }
        const qs = params.toString()
        startTransition(() => {
            router.push(qs ? `${target}?${qs}` : target)
        })
    }

    return (
        <label className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="uppercase tracking-wider">{label}</span>
            <select
                value={selectedId ?? ''}
                onChange={e => handleChange(e.target.value)}
                disabled={isPending}
                className="bg-background border border-border text-text text-xs px-2 py-1 rounded-none focus:outline-none focus:border-accent disabled:opacity-60 max-w-[220px]"
            >
                <option value="">All events</option>
                {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
            </select>
        </label>
    )
}
