import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
    const cookieStore = cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                // Never let Next.js's persistent Data Cache serve stale DB reads —
                // see the note in lib/supabase/admin.ts.
                fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
            },
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // The `set` method is called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // Same as above
                    }
                },
            },
        }
    )
}
