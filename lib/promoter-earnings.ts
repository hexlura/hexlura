import { createServiceClient } from '@/lib/supabase/service'

/**
 * Move a promoter's `pending` earnings to `available` once the underlying event
 * has ended and the configurable cooldown window has elapsed. Mirrors the
 * organiser payout cooldown logic in lib/generate-payouts.ts.
 *
 * Called from the promoter dashboard / payouts pages so the available balance
 * updates lazily without a cron job.
 *
 * Skips bookings on cancelled or refunded events.
 */
export async function markEarningsAvailable(promoterId: string): Promise<void> {
    const supabase = createServiceClient()

    const { data: cooldownRow } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'payout_cooldown_days')
        .single()

    const cooldownDays = parseInt(cooldownRow?.value ?? '2', 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - cooldownDays)
    const cutoffISO = cutoff.toISOString()

    // Pull pending earnings + their event end times in one shot
    const { data: pending } = await supabase
        .from('promoter_earnings')
        .select('id, event:events(end_at, start_at, status), booking:bookings(status)')
        .eq('promoter_id', promoterId)
        .eq('status', 'pending')

    if (!pending || pending.length === 0) return

    type Row = {
        id: string
        event: { end_at: string | null; start_at: string; status: string } | null
        booking: { status: string } | null
    }

    const releaseIds: string[] = []
    for (const row of pending as unknown as Row[]) {
        if (!row.event || !row.booking) continue
        if (row.booking.status !== 'confirmed') continue
        if (row.event.status === 'cancelled') continue
        const endsAt = row.event.end_at || row.event.start_at
        if (endsAt < cutoffISO) releaseIds.push(row.id)
    }

    if (releaseIds.length === 0) return

    await supabase
        .from('promoter_earnings')
        .update({ status: 'available', available_at: new Date().toISOString() })
        .in('id', releaseIds)
}

/**
 * Mark a booking's promoter_earnings row as `reversed` (full refund).
 * Skips rows already paid out — that money has left the building, so reversal
 * has to be handled out-of-band (deduct from the next payout). For v1 we just
 * log it.
 *
 * Best-effort: caller doesn't need to await success.
 */
export async function reversePromoterEarningsForBooking(bookingId: string): Promise<void> {
    const supabase = createServiceClient()
    const { data: row } = await supabase
        .from('promoter_earnings')
        .select('id, status')
        .eq('booking_id', bookingId)
        .maybeSingle()

    if (!row) return

    if (row.status === 'paid') {
        console.warn(
            `Cannot reverse promoter_earnings ${row.id} — already paid out. ` +
            `Deduct manually from next payout for booking ${bookingId}.`
        )
        return
    }

    await supabase
        .from('promoter_earnings')
        .update({ status: 'reversed', reversed_at: new Date().toISOString() })
        .eq('id', row.id)
}

