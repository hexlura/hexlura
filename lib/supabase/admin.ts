import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client — uses the service role key to bypass RLS entirely.
 * ONLY use server-side (Server Components, API routes, Server Actions).
 * NEVER import in client components or expose via NEXT_PUBLIC_ vars.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
