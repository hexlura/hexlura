import { createServiceClient } from '@/lib/supabase/service'

const RESERVED_CODES = new Set([
    'ADMIN', 'SUPPORT', 'HEXLURA', 'STAFF', 'ROOT', 'API', 'SYSTEM',
    'OWNER', 'TEST', 'NULL', 'UNDEFINED', 'PROMOTER', 'ORGANISER',
])

/**
 * Returns the promoter_profiles.id for a given user, or null if they aren't a promoter.
 */
export async function resolvePromoterId(userId: string): Promise<string | null> {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
        .from('promoter_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
    return data?.id || null
}

/**
 * Look up a promoter by their referral code (case-insensitive).
 * Used at checkout / click-tracking to attribute referrals.
 */
export async function getPromoterByReferralCode(code: string): Promise<{ id: string; user_id: string } | null> {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
        .from('promoter_profiles')
        .select('id, user_id')
        .ilike('referral_code', code)
        .maybeSingle()
    return data || null
}

/**
 * Generate a unique referral code derived from a display name.
 * Strips non-alphanumerics, uppercases, truncates, and appends a numeric suffix
 * if needed to resolve collisions. Falls back to a fully random code after 5 retries.
 */
export async function generateUniqueReferralCode(displayName: string): Promise<string> {
    const serviceClient = createServiceClient()
    const base = displayName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 10) || 'PROMO'

    const candidates: string[] = []
    candidates.push(base)
    for (let i = 2; i <= 5; i++) candidates.push(`${base}${i}`)

    for (const candidate of candidates) {
        if (RESERVED_CODES.has(candidate)) continue
        const { data } = await serviceClient
            .from('promoter_profiles')
            .select('id')
            .ilike('referral_code', candidate)
            .maybeSingle()
        if (!data) return candidate
    }

    // Fallback: random alphanumeric
    for (let attempt = 0; attempt < 5; attempt++) {
        const random = Math.random().toString(36).slice(2, 9).toUpperCase()
        const { data } = await serviceClient
            .from('promoter_profiles')
            .select('id')
            .ilike('referral_code', random)
            .maybeSingle()
        if (!data) return random
    }

    throw new Error('Could not generate a unique referral code after multiple attempts')
}
