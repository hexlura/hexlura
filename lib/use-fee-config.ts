'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'

export function useFeeConfig(): FeeConfig {
    const [config, setConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG)

    useEffect(() => {
        const supabase = createClient()
        supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['booking_fee_percent', 'booking_fee_min_pence', 'booking_fee_max_pence', 'order_processing_fee_pence'])
            .then(({ data }) => {
                if (!data?.length) return
                const s: Record<string, string> = {}
                for (const row of data) s[row.key] = row.value
                setConfig({
                    percent: parseFloat(s['booking_fee_percent']) || 0,
                    minPence: parseInt(s['booking_fee_min_pence']) || 0,
                    maxPence: parseInt(s['booking_fee_max_pence']) || 0,
                    processingFeePence: parseInt(s['order_processing_fee_pence'] ?? '0'),
                })
            })
    }, [])

    return config
}
