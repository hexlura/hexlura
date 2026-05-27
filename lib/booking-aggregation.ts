// Group tickets are stored as one booking_items row per group member (so each
// member gets a unique QR code). Showing those raw rows on an invoice makes a
// single £20 group ticket look like 4 × £20. This helper collapses raw rows
// into one display row per ticket type, with the correct ticket count and
// subtotal — group rows are divided by group_size to recover the number of
// tickets actually purchased.

export interface RawBookingItem {
    id: string
    quantity: number | null
    unit_price_pence: number | null
    attendee_name: string | null
    ticket_type_id?: string | null
    ticket_type: {
        name: string
        is_group?: boolean | null
        group_size?: number | null
    } | null
}

export interface AggregatedTicketRow {
    key: string                  // stable React key
    name: string
    quantity: number             // number of TICKETS purchased (groups counted as 1, not group_size)
    unit_price_pence: number
    subtotal_pence: number
    attendee_name: string | null
    is_group: boolean
    group_size: number           // 1 for non-group, n for groups
}

export function aggregateBookingItems(items: RawBookingItem[]): AggregatedTicketRow[] {
    const buckets = new Map<string, {
        key: string
        name: string
        rowQuantity: number
        unit_price_pence: number
        attendee_name: string | null
        is_group: boolean
        group_size: number
    }>()

    for (const item of items) {
        const isGroup = item.ticket_type?.is_group === true
        const groupSize = isGroup ? Math.max(1, item.ticket_type?.group_size ?? 1) : 1
        const key = item.ticket_type_id ?? `${item.ticket_type?.name ?? 'ticket'}__${item.unit_price_pence ?? 0}`
        const rowQty = item.quantity ?? 1

        const existing = buckets.get(key)
        if (existing) {
            existing.rowQuantity += rowQty
            if (!existing.attendee_name && item.attendee_name) {
                existing.attendee_name = item.attendee_name
            }
        } else {
            buckets.set(key, {
                key,
                name: item.ticket_type?.name || 'Ticket',
                rowQuantity: rowQty,
                unit_price_pence: item.unit_price_pence ?? 0,
                attendee_name: item.attendee_name,
                is_group: isGroup,
                group_size: groupSize,
            })
        }
    }

    return Array.from(buckets.values()).map(b => {
        const tickets = b.is_group
            ? Math.max(1, Math.round(b.rowQuantity / b.group_size))
            : b.rowQuantity
        return {
            key: b.key,
            name: b.name,
            quantity: tickets,
            unit_price_pence: b.unit_price_pence,
            subtotal_pence: b.unit_price_pence * tickets,
            attendee_name: b.attendee_name,
            is_group: b.is_group,
            group_size: b.group_size,
        }
    })
}
