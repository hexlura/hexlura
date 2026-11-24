import { createAdminClient } from '@/lib/supabase/admin'

// Promo codes are not publicly readable (migration 082), so lookups run with the service role.
//
// The code is matched case-insensitively but literally: `ilike` treats % and _ as wildcards, so an
// unescaped code like "%" or "A%" would match codes the buyer was never given.
export async function findPromoByCode(rawCode: unknown) {
    if (typeof rawCode !== 'string') return { promo: null, error: null }
    const code = rawCode.trim()
    if (!code || code.length > 64) return { promo: null, error: null }

    const literal = code.replace(/[\\%_]/g, (c) => `\\${c}`)
    const { data, error } = await createAdminClient()
        .from('promo_codes')
        .select('*')
        .ilike('code', literal)
        .maybeSingle()

    return { promo: data, error }
}
