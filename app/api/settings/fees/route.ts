import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FeeConfig } from '@/lib/fees'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
        percent: parseFloat(s['booking_fee_percent']) || 0,
        minPence: parseInt(s['booking_fee_min_pence']) || 0,
        maxPence: parseInt(s['booking_fee_max_pence']) || 0,
        processingFeePence: parseInt(s['order_processing_fee_pence'] ?? '0'),
    }

    const eventId = request.nextUrl.searchParams.get('event_id')
    if (eventId) {
        const { data: event } = await adminClient
            .from('events')
            .select('organiser_id')
            .eq('id', eventId)
            .single()

        if (event?.organiser_id) {
            const { data: organiser } = await adminClient
                .from('organiser_profiles')
                .select('stripe_connect_allowed, stripe_charges_enabled, fee_exempt')
                .eq('id', event.organiser_id)
                .single()

            const exempt = !!(organiser?.stripe_connect_allowed && organiser?.stripe_charges_enabled && organiser?.fee_exempt)
            if (exempt) {
                config.percent = 0
                config.minPence = 0
                config.maxPence = 0
                config.processingFeePence = 0
            }
        }
    }

    return NextResponse.json(config, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
