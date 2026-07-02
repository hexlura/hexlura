import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/lib/fees'

export const dynamic = 'force-dynamic'

export async function GET() {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('platform_settings')
        .select('key, value')
        .in('key', ['booking_fee_percent', 'booking_fee_min_pence', 'booking_fee_max_pence', 'order_processing_fee_pence'])

    if (error) {
        console.error('fees endpoint: platform_settings read failed:', error)
    }

    const s: Record<string, string> = {}
    for (const row of (data ?? [])) s[row.key] = row.value

    const config: FeeConfig = {
        percent: parseFloat(s['booking_fee_percent']) || DEFAULT_FEE_CONFIG.percent,
        minPence: parseInt(s['booking_fee_min_pence']) || DEFAULT_FEE_CONFIG.minPence,
        maxPence: parseInt(s['booking_fee_max_pence']) || DEFAULT_FEE_CONFIG.maxPence,
        processingFeePence: s['order_processing_fee_pence'] !== undefined
            ? parseInt(s['order_processing_fee_pence'])
            : DEFAULT_FEE_CONFIG.processingFeePence,
    }

    return NextResponse.json(config, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
