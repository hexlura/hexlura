'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'

let cachedConfig: FeeConfig | null = null
let fetchPromise: Promise<FeeConfig> | null = null

function fetchFeeConfig(): Promise<FeeConfig> {
    if (!fetchPromise) {
        fetchPromise = fetch('/api/settings/fees')
            .then((res) => res.json())
            .then((data: FeeConfig) => {
                cachedConfig = data
                return data
            })
            .catch(() => DEFAULT_FEE_CONFIG)
    }
    return fetchPromise
}

export function useFeeConfig(serverConfig?: FeeConfig): FeeConfig {
    const [config, setConfig] = useState<FeeConfig>(serverConfig ?? cachedConfig ?? DEFAULT_FEE_CONFIG)

    useEffect(() => {
        if (serverConfig) return
        if (cachedConfig) {
            setConfig(cachedConfig)
            return
        }
        fetchFeeConfig().then(setConfig)
    }, [serverConfig])

    return config
}
