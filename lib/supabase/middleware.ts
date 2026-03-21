import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
    // Step 1: Create response and Supabase client to refresh session
    let supabaseResponse = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    supabaseResponse = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    supabaseResponse.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    supabaseResponse = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    supabaseResponse.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Step 2: Refresh session and get user
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Classify routes
    const isAdminRoute = pathname.startsWith('/admin')
    const isOrganiserRoute = pathname.startsWith('/organiser')
    const isAccountRoute = pathname.startsWith('/account') || pathname.startsWith('/bookings') || pathname.startsWith('/checkout')
    const isAuthRoute = (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register'))
    const isProtectedRoute = isAdminRoute || isOrganiserRoute || isAccountRoute

    // Helper: redirect while preserving session cookies
    function redirectTo(path: string): NextResponse {
        const url = request.nextUrl.clone()
        url.pathname = path
        const redirectRes = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectRes.cookies.set(cookie)
        })
        return redirectRes
    }

    // Unauthenticated users trying to access protected routes → login
    if (!user && isProtectedRoute) {
        return redirectTo('/auth/login')
    }

    // No role checks needed for unauthenticated users on public/auth routes
    if (!user) {
        return supabaseResponse
    }

    // Step 3: Authenticated user — fetch role
    const serviceClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'

    // Authenticated user on auth pages → redirect to their dashboard
    if (isAuthRoute) {
        if (role === 'admin') return redirectTo('/admin')
        if (role === 'organiser') return redirectTo('/organiser')
        return redirectTo('/account')
    }

    // Admin routes: must be admin
    if (isAdminRoute) {
        if (role !== 'admin') return redirectTo('/')
    }

    // Organiser routes (except /organiser/apply)
    if (isOrganiserRoute) {
        const isExempt = pathname === '/organiser/apply'

        if (!isExempt) {
            // Regular organiser routes: must be organiser or admin
            if (role !== 'organiser' && role !== 'admin') {
                return redirectTo('/')
            }
        }
    }

    // Account routes: already checked auth above, allow through
    // All other routes: allow through

    return supabaseResponse
}
