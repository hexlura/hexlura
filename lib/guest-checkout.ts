import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Whether buyers may check out without an account (Supabase anonymous auth).
 *
 * Stored in `platform_settings.guest_checkout_enabled` ('true' / 'false').
 * Default is OFF: a missing row, or a failed read, means guests are blocked —
 * this was switched off at the client's request, and a failed read must never
 * quietly re-open it. Logged-in buyers are never affected.
 */
export async function isGuestCheckoutEnabled(): Promise<boolean> {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'guest_checkout_enabled')
        .maybeSingle()

    if (error) {
        console.error('guest_checkout_enabled read failed — treating guest checkout as disabled:', error.message)
        return false
    }
    return data?.value === 'true'
}

export const GUEST_CHECKOUT_DISABLED_MESSAGE =
    'Please log in or create an account to buy tickets.'
