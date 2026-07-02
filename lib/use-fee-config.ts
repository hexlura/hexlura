'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'

export function useFeeConfig(serverConfig?: FeeConfig): FeeConfig {
    const [config, setConfig] = useState<FeeConfig>(serverConfig ?? DEFAULT_FEE_CONFIG)

    useEffect(() => {
        if (serverConfig) return
        fetch('/api/settings/fees')
            .then((res) => res.json())
            .then((data: FeeConfig) => setConfig(data))
            .catch(() => {})
    }, [serverConfig])

    return config
}
