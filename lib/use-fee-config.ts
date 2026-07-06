'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'

export function useFeeConfig(eventId?: string): FeeConfig {
    const [config, setConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG)

    useEffect(() => {
        const url = eventId ? `/api/settings/fees?event_id=${encodeURIComponent(eventId)}` : '/api/settings/fees'
        fetch(url)
            .then((res) => (res.ok ? res.json() : null))
            .then((data: FeeConfig | null) => {
                if (data) setConfig(data)
            })
            .catch(() => {})
    }, [eventId])

    return config
}
