import { NextRequest } from 'next/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Resolves the authenticated user for an API route from either source:
 * - Authorization: Bearer <token> — used by the mobile app (no cookie jar)
 * - Cookie-based session — used by the web app
 * Bearer tokens are verified against Supabase Auth (not just decoded), same
 * trust level as the cookie path.
 */
export async function getRequestUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const anon = createAnonClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await anon.auth.getUser(token)
        return user
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}
