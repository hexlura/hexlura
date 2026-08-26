export interface PromoCartLine {
    ticket_type_id: string
    /** Unit price, not the line total. */
    price_pence: number
    quantity: number
}

/**
 * How much of a cart a promo code may discount, after both scopes:
 *
 * - `ticketTypeId` narrows it to one tier (NULL = the whole order)
 * - `maxTickets` caps how many individual tickets the code covers in this
 *   order (NULL = all of them)
 *
 * Shared by /api/promo/validate (what the buyer is shown) and
 * /api/checkout/create-intent (what they are actually charged) so the quoted
 * discount and the charged discount cannot drift apart.
 */
export function computeEligiblePence(
    lines: PromoCartLine[],
    ticketTypeId: string | null,
    maxTickets: number | null
): number {
    // /api/promo/validate takes its line items from the client, so quantities
    // are sanitised here rather than trusted — create-intent recomputes them
    // from the database and is the authority on what is charged.
    const eligible = lines
        .filter(l => !ticketTypeId || l.ticket_type_id === ticketTypeId)
        .map(l => ({
            price_pence: Math.max(0, Math.floor(Number(l.price_pence) || 0)),
            quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)),
        }))

    if (maxTickets === null) {
        return eligible.reduce((sum, l) => sum + l.price_pence * l.quantity, 0)
    }

    // Cheapest tickets first. The cap exists to bound what the organiser gives
    // away, so when a cart holds more eligible tickets than the cap allows, the
    // code covers the least valuable ones and the buyer pays for the rest.
    // Counted by walking the lines rather than expanding to one entry per
    // ticket — a client-supplied quantity must not be able to allocate an
    // arbitrarily large array here.
    const sorted = [...eligible].sort((a, b) => a.price_pence - b.price_pence)

    let remaining = maxTickets
    let total = 0
    for (const line of sorted) {
        if (remaining <= 0) break
        const take = Math.min(line.quantity, remaining)
        total += line.price_pence * take
        remaining -= take
    }
    return total
}
