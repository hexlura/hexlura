import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * ONLY use server-side (Server Components, API routes, middleware).
 * NEVER import this in client components or expose via NEXT_PUBLIC_ vars.
 */
export function createServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: { persistSession: false },
            global: {
                // Never let Next.js's persistent Data Cache serve stale DB reads —
                // see the note in lib/supabase/admin.ts.
                fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
            },
        }
    )
}
