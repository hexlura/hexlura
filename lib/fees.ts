/**
 * Hexlura booking fee calculation.
 *
 * Fee is a percentage of the ticket price, clamped between the
 * configured min and max. Paid by the buyer on top of the ticket price.
 * Organiser receives 100% of their ticket price.
 *
 * Fee parameters are stored in the `platform_settings` table
 * and configurable via the admin dashboard.
 */

import { createServiceClient } from '@/lib/supabase/service'

export interface FeeConfig {
    /** Fee percentage (e.g. 5 means 5%) */
    percent: number
    /** Minimum fee per ticket in pence */
    minPence: number
    /** Maximum fee per ticket in pence */
    maxPence: number
    /** Flat order processing fee per order in pence */
    processingFeePence: number
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
    percent: 0,
    minPence: 0,
    maxPence: 0,
    processingFeePence: 0,
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
            'booking_fee_min_pence',
            'booking_fee_max_pence',
            'order_processing_fee_pence',
        ])

    const settings: Record<string, string> = {}
    if (data) {
        for (const row of data) {
            settings[row.key] = row.value
        }
    }

    return {
        percent: parseFloat(settings['booking_fee_percent']) || DEFAULT_FEE_CONFIG.percent,
        minPence: parseInt(settings['booking_fee_min_pence']) || DEFAULT_FEE_CONFIG.minPence,
        maxPence: parseInt(settings['booking_fee_max_pence']) || DEFAULT_FEE_CONFIG.maxPence,
        processingFeePence: settings['order_processing_fee_pence'] !== undefined
            ? parseInt(settings['order_processing_fee_pence'])
            : DEFAULT_FEE_CONFIG.processingFeePence,
    }
}

export function calculateBookingFeePerTicket(ticketPricePence: number, config: FeeConfig = DEFAULT_FEE_CONFIG): number {
    if (ticketPricePence === 0) return 0
    const raw = Math.round(ticketPricePence * config.percent / 100)
    return Math.max(config.minPence, Math.min(config.maxPence, raw))
}

export function calculateBookingFee(ticketPricePence: number, quantity: number, config: FeeConfig = DEFAULT_FEE_CONFIG): number {
    return calculateBookingFeePerTicket(ticketPricePence, config) * quantity
}

/**
 * Booking-fee inputs needed to show buyers an all-in ticket price in listings:
 * the live fee config plus the organisers whose booking fee is waived.
 */
export interface ListingFees {
    config: FeeConfig
    /** Organisers whose booking fee is waived */
    exemptOrganiserIds: string[]
    /** Organisers whose order processing fee is waived */
    processingExemptOrganiserIds: string[]
}

/** Server-side. Reads live fee config and the booking-fee-exempt organisers. */
export async function getListingFees(): Promise<ListingFees> {
    const config = await getFeeConfig()
    const supabase = createServiceClient()
    const { data, error } = await supabase
        .from('organiser_profiles')
        .select('id, booking_fee_exempt, processing_fee_exempt')
        .or('booking_fee_exempt.eq.true,processing_fee_exempt.eq.true')
    if (error) console.error('getListingFees: exempt organisers read failed:', error)
    const rows = data ?? []
    return {
        config,
        exemptOrganiserIds: rows.filter(o => o.booking_fee_exempt).map(o => o.id),
        processingExemptOrganiserIds: rows.filter(o => o.processing_fee_exempt).map(o => o.id),
    }
}

/**
 * What a buyer pays for one ticket bought on its own: ticket price plus booking
 * fee plus the per-order processing fee, as a single all-in figure. Mirrors
 * checkout, including organiser exemptions. `fees` null (not loaded yet) falls
 * back to the bare price.
 */
export function buyerTicketPrice(
    pricePence: number,
    organiserId: string | null | undefined,
    fees: ListingFees | null,
): { totalPence: number; feePence: number } {
    if (!fees || pricePence <= 0) return { totalPence: pricePence, feePence: 0 }
    const bookingExempt = !!organiserId && fees.exemptOrganiserIds.includes(organiserId)
    const processingExempt = !!organiserId && fees.processingExemptOrganiserIds.includes(organiserId)
    const feePence =
        (bookingExempt ? 0 : calculateBookingFeePerTicket(pricePence, fees.config)) +
        (processingExempt ? 0 : fees.config.processingFeePence)
    return { totalPence: pricePence + feePence, feePence }
}

/**
 * Spread a fee across ticket lines in proportion to each line's base amount, so
 * receipts can show every line all-in. Lines sum exactly to the fee; rounding
 * remainder lands on the last non-zero line.
 */
export function allocateFee(basesPence: number[], feePence: number): number[] {
    const total = basesPence.reduce((a, b) => a + b, 0)
    if (total <= 0 || feePence <= 0) return basesPence.map(() => 0)
    const shares = basesPence.map(b => Math.floor((feePence * b) / total))
    let remainder = feePence - shares.reduce((a, b) => a + b, 0)
    for (let i = basesPence.length - 1; i >= 0 && remainder > 0; i--) {
        if (basesPence[i] > 0) { shares[i] += remainder; remainder = 0 }
    }
    return shares
}

export function formatPence(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
}
