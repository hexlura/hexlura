export interface BookingItemRow {
    id: string
    qr_code: string | null
    quantity: number
    ticket_type?: { name: string; is_group?: boolean; group_size?: number } | null
}

export interface TicketDescriptor {
    token: string
    ticketName: string
    isGroup: boolean
}

// One descriptor per physical ticket. Each booking_item row has quantity=1 and
// its own unique qr_code (group tickets get one row per member, inserted at
// booking time) — this is the token the door scanner validates.
export function buildTicketDescriptors(items: BookingItemRow[], bookingRef: string): TicketDescriptor[] {
    const descriptors: TicketDescriptor[] = []

    for (const item of items) {
        const isGroup = item.ticket_type?.is_group === true
        const ticketName = item.ticket_type?.name ?? 'Ticket'

        if (isGroup) {
            descriptors.push({
                token: item.qr_code || bookingRef,
                ticketName,
                isGroup: true,
            })
        } else {
            const qty = item.quantity || 1
            for (let t = 0; t < qty; t++) {
                descriptors.push({
                    token: item.qr_code || bookingRef,
                    ticketName,
                    isGroup: false,
                })
            }
        }
    }

    return descriptors
}
