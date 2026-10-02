'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

interface EventFilterProps {
    events: { id: string; title: string }[]
    selectedId: string | null
    basePath?: string
    /**
     * Extra query params to preserve when changing the event filter.
     * Pass them flat — keys with empty/null values will be dropped.
     */
    extraParams?: Record<string, string | null | undefined>
}

export function EventFilter({ events, selectedId, basePath, extraParams }: EventFilterProps) {
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
        <ThemedSelect
            value={selectedId ?? ''}
            onChange={e => handleChange(e.target.value)}
            disabled={isPending}
            aria-label="Filter by event"
            className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25 disabled:opacity-60 max-w-[220px]"
        >
            <option value="">All Events</option>
            {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
        </ThemedSelect>
    )
}
