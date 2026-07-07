import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client — uses the service role key to bypass RLS entirely.
 * ONLY use server-side (Server Components, API routes, Server Actions).
 * NEVER import in client components or expose via NEXT_PUBLIC_ vars.
 *
 * cache: 'no-store' — Next.js's Data Cache persists GET fetches made inside
 * GET route handlers across requests AND deployments on Vercel, which froze
 * organiser_profiles fee-flag reads at their first-fetched values (admin
 * toggles appeared to never turn off). All reads through this client are
 * transactional platform data and must never be served from a fetch cache.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            global: {
                fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
            },
        }
    )
}
