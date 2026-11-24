// Validates the cart lines a buyer sends to checkout / reservations.
//
// Prices always come from the DB, but quantities come from the request. A negative or fractional
// quantity would lower the subtotal (a +2 / -2 cart nets to £0 and takes the free-booking path while
// still issuing real tickets), so every line must be a whole number from 1 to the per-order cap, and
// each ticket type may appear only once.

export const DEFAULT_MAX_PER_ORDER = 10 // matches BookingWidget's fallback when max_per_order is unset
const MAX_LINES = 20

export interface CartLine {
    ticket_type_id: string
    quantity: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns the clean lines, or an error message. Per-type caps are checked later against the DB row. */
export function parseCartLines(raw: unknown): { lines: CartLine[] } | { error: string } {
    if (!Array.isArray(raw) || raw.length === 0) return { error: 'No tickets selected' }
    if (raw.length > MAX_LINES) return { error: 'Too many ticket lines' }

    const seen = new Set<string>()
    const lines: CartLine[] = []
    for (const entry of raw) {
        const id = (entry as { ticket_type_id?: unknown })?.ticket_type_id
        const qty = (entry as { quantity?: unknown })?.quantity
        if (typeof id !== 'string' || !UUID_RE.test(id)) return { error: 'Invalid ticket type' }
        if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 100) {
            return { error: 'Invalid ticket quantity' }
        }
        if (seen.has(id)) return { error: 'Each ticket type can only appear once' }
        seen.add(id)
        lines.push({ ticket_type_id: id, quantity: qty })
    }
    return { lines }
}

/** The per-order cap for a ticket type (its max_per_order, else the UI default). */
export function maxPerOrder(ticketType: { max_per_order?: number | null }): number {
    const cap = ticketType.max_per_order
    return typeof cap === 'number' && cap > 0 ? cap : DEFAULT_MAX_PER_ORDER
}
