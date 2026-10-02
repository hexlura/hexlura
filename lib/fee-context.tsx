'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_FEE_CONFIG, type FeeConfig, type ListingFees } from '@/lib/fees'

/**
 * Supplies booking-fee data to buyer-facing price displays (event cards,
 * hero slider, etc.) so listings can show the all-in price.
 *
 * Server pages should wrap their output in <FeeProvider fees={…}> so the first
 * paint already has the right prices. Client-only pages fall back to a single
 * shared fetch of /api/settings/fees.
 */
const FeeContext = createContext<ListingFees | null>(null)

export function FeeProvider({ fees, children }: { fees: ListingFees; children: ReactNode }) {
    return <FeeContext.Provider value={fees}>{children}</FeeContext.Provider>
}

let cached: ListingFees | null = null
let inflight: Promise<ListingFees> | null = null

function loadFees(): Promise<ListingFees> {
    if (cached) return Promise.resolve(cached)
    if (!inflight) {
        inflight = fetch('/api/settings/fees')
            .then(res => {
                if (!res.ok) throw new Error(`fees endpoint returned ${res.status}`)
                return res.json() as Promise<FeeConfig & { exempt_organiser_ids?: string[]; processing_exempt_organiser_ids?: string[] }>
            })
            .then(data => {
                const { exempt_organiser_ids, processing_exempt_organiser_ids, ...config } = data
                cached = {
                    config,
                    exemptOrganiserIds: exempt_organiser_ids ?? [],
                    processingExemptOrganiserIds: processing_exempt_organiser_ids ?? [],
                }
                return cached
            })
            .catch(err => {
                console.error('Failed to load booking fee settings:', err)
                // Don't cache the failure; show bare prices rather than a blank.
                return { config: DEFAULT_FEE_CONFIG, exemptOrganiserIds: [], processingExemptOrganiserIds: [] }
            })
            .finally(() => { inflight = null })
    }
    return inflight
}

/** Returns null only while the fee data is still loading. */
export function useListingFees(): ListingFees | null {
    const fromServer = useContext(FeeContext)
    const [fees, setFees] = useState<ListingFees | null>(cached)

    useEffect(() => {
        if (fromServer || fees) return
        let alive = true
        loadFees().then(f => { if (alive) setFees(f) })
        return () => { alive = false }
    }, [fromServer, fees])

    return fromServer ?? fees
}
