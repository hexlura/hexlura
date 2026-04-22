/**
 * Hexlura booking fee calculation.
 *
 * Fee is percentage of ticket price + fixed fee per ticket,
 * clamped between configured min and max.
 * Paid by the buyer on top of the ticket price.
 * Organiser receives 100% of their ticket price.
 *
 * Fee parameters are stored in the `platform_settings` table
 * and configurable via the admin dashboard.
 */

import { createServiceClient } from '@/lib/supabase/service'

export interface FeeConfig {
    /** Fee percentage (e.g. 5 means 5%) */
    percent: number
    /** Fixed fee in pence added per ticket */
    fixedPence: number
    /** Minimum fee per ticket in pence */
    minPence: number
    /** Maximum fee per ticket in pence */
    maxPence: number
}

/** Fallback defaults matching DB seed values in 004_platform_settings.sql */
export const DEFAULT_FEE_CONFIG: FeeConfig = {
    percent: 5,
    fixedPence: 49,
    minPence: 99,
    maxPence: 500,
}

/**
 * Load fee config from the platform_settings table.
 * Falls back to DEFAULT_FEE_CONFIG if any value is missing.
 * Server-side only (uses service client).
 */
export async function getFeeConfig(): Promise<FeeConfig> {
    const supabase = createServiceClient()
    const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
            'booking_fee_percent',
            'booking_fee_fixed_pence',
            'booking_fee_min_pence',
            'booking_fee_max_pence',
        ])

    const settings: Record<string, string> = {}
    if (data) {
        for (const row of data) {
            settings[row.key] = row.value
        }
    }

    return {
        percent: parseFloat(settings['booking_fee_percent']) || DEFAULT_FEE_CONFIG.percent,
        fixedPence: parseInt(settings['booking_fee_fixed_pence']) || DEFAULT_FEE_CONFIG.fixedPence,
        minPence: parseInt(settings['booking_fee_min_pence']) || DEFAULT_FEE_CONFIG.minPence,
        maxPence: parseInt(settings['booking_fee_max_pence']) || DEFAULT_FEE_CONFIG.maxPence,
    }
}

export function calculateBookingFeePerTicket(ticketPricePence: number, config: FeeConfig = DEFAULT_FEE_CONFIG): number {
    if (ticketPricePence === 0) return 0
    const raw = Math.round(ticketPricePence * config.percent / 100) + config.fixedPence
    return Math.max(config.minPence, Math.min(config.maxPence, raw))
}

export function calculateBookingFee(ticketPricePence: number, quantity: number, config: FeeConfig = DEFAULT_FEE_CONFIG): number {
    return calculateBookingFeePerTicket(ticketPricePence, config) * quantity
}

export function formatPence(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
}
