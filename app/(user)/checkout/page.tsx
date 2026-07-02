export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { CheckoutProvider } from '@/lib/checkout-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'
import CheckoutFlow from './checkout-flow'

async function loadFeeConfig(): Promise<FeeConfig> {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('platform_settings')
        .select('key, value')
        .in('key', ['booking_fee_percent', 'booking_fee_min_pence', 'booking_fee_max_pence', 'order_processing_fee_pence'])

    const s: Record<string, string> = {}
    for (const row of (data ?? [])) s[row.key] = row.value

    return {
        percent: parseFloat(s['booking_fee_percent']) || DEFAULT_FEE_CONFIG.percent,
        minPence: parseInt(s['booking_fee_min_pence']) || DEFAULT_FEE_CONFIG.minPence,
        maxPence: parseInt(s['booking_fee_max_pence']) || DEFAULT_FEE_CONFIG.maxPence,
        processingFeePence: s['order_processing_fee_pence'] !== undefined
            ? parseInt(s['order_processing_fee_pence'])
            : DEFAULT_FEE_CONFIG.processingFeePence,
    }
}

export default async function CheckoutPage() {
    const feeConfig = await loadFeeConfig()

    return (
        <CheckoutProvider initialFeeConfig={feeConfig}>
            <Suspense fallback={
                <div className="max-w-3xl mx-auto py-12 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted mt-4">Loading checkout...</p>
                </div>
            }>
                <CheckoutFlow />
            </Suspense>
        </CheckoutProvider>
    )
}
