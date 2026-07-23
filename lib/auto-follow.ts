import { createAdminClient } from '@/lib/supabase/admin'

// Silently follows the organiser on the buyer's behalf when a booking is
// confirmed. Deliberately does NOT send the "new follower" notification that
// /api/follows sends for a genuine opt-in follow — that notification would
// otherwise fire on every single ticket sale, which isn't a meaningful signal
// for the organiser the way a real deliberate follow is.
// Idempotent: ignores the (user_id, organiser_id) unique-constraint conflict
// on repeat purchases from the same buyer.
export async function autoFollowOrganiser(userId: string, organiserId: string): Promise<void> {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('follows')
            .upsert(
                { user_id: userId, organiser_id: organiserId },
                { onConflict: 'user_id,organiser_id', ignoreDuplicates: true }
            )
        if (error) console.error('Auto-follow failed:', error.message)
    } catch (err) {
        // Never let a follow failure affect the booking/checkout flow
        console.error('Auto-follow threw:', err)
    }
}
