/**
 * Hexlura booking fee calculation.
 *
 * Fee is 7% of ticket price per ticket, clamped between £0.50 and £5.00.
 * Paid by the buyer on top of the ticket price.
 * Organiser receives 100% of their ticket price.
 */

export function calculateBookingFeePerTicket(ticketPricePence: number): number {
    return Math.max(50, Math.min(500, Math.round(ticketPricePence * 0.07)))
}

export function calculateBookingFee(ticketPricePence: number, quantity: number): number {
    return calculateBookingFeePerTicket(ticketPricePence) * quantity
}

export function formatPence(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
}
