import { createServiceClient } from '@/lib/supabase/service'

/**
 * Auto-generate pending payout records for completed events that don't
 * already have one.  Called from the organiser dashboard / payouts pages
 * so the balance updates after the configurable cooldown period.
 *
 * A payout row is created per event once:
 *   - The event ended more than `payout_cooldown_days` ago
 *   - At least one confirmed booking exists
 *   - No payout row already exists for that event + organiser
 */
export async function generatePayoutsForOrganiser(organiserId: string) {
    const supabase = createServiceClient()

    // Read configurable cooldown from platform_settings (default 2 days)
    const { data: cooldownRow } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'payout_cooldown_days')
        .single()

    const cooldownDays = parseInt(cooldownRow?.value ?? '2', 10)

    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - cooldownDays)
    const cutoffISO = cutoff.toISOString()

    // 1. Get all events for this organiser
    const { data: events } = await supabase
        .from('events')
        .select('id, end_at, start_at')
        .eq('organiser_id', organiserId)

    if (!events || events.length === 0) return

    // 2. Filter to events that ended before the cutoff (cooldown has passed)
    const eligibleEvents = events.filter(e => {
        const endDate = e.end_at || e.start_at
        return endDate < cutoffISO
    })

    if (eligibleEvents.length === 0) return

    // 3. Get existing payouts for this organiser to avoid duplicates
    const { data: existingPayouts } = await supabase
        .from('payouts')
        .select('event_id')
        .eq('organiser_id', organiserId)

    const existingEventIds = new Set((existingPayouts || []).map(p => p.event_id))

    // 4. For each eligible event without a payout, aggregate bookings and create one
    for (const event of eligibleEvents) {
        if (existingEventIds.has(event.id)) continue

        // Sum confirmed bookings for this event
        const { data: bookings } = await supabase
            .from('bookings')
            .select('ticket_subtotal_pence')
            .eq('event_id', event.id)
            .eq('status', 'confirmed')

        if (!bookings || bookings.length === 0) continue

        const grossPence = bookings.reduce((sum, b) => sum + (b.ticket_subtotal_pence || 0), 0)

        if (grossPence <= 0) continue

        // Fee is paid by buyer, organiser gets 100% of ticket price
        const feePence = 0
        const netPence = grossPence - feePence

        // scheduled_at = event end date + cooldown period
        const eventEnd = new Date(event.end_at || event.start_at)
        eventEnd.setDate(eventEnd.getDate() + cooldownDays)

        await supabase.from('payouts').insert({
            organiser_id: organiserId,
            event_id: event.id,
            gross_pence: grossPence,
            fee_pence: feePence,
            net_pence: netPence,
            status: 'pending',
            scheduled_at: eventEnd.toISOString(),
        })
    }
}
