import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

/** Copy all cookies from a (possibly refreshed) session response into a redirect. */
function redirectWithCookies(destination: URL, sessionResponse: NextResponse): NextResponse {
    const redirectResponse = NextResponse.redirect(destination)
    sessionResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            secure: cookie.secure,
            maxAge: cookie.maxAge,
            path: cookie.path,
        })
    })
    return redirectResponse
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
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
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Refresh the session
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Routes exempt from organiser role check (accessible by any authenticated user)
    const isOrganiserApplyRoute = pathname === '/organiser/apply'
    const isOrganiserPendingRoute = pathname === '/organiser/pending'

    // Protected routes that require authentication
    const isAccountRoute = pathname.startsWith('/account') || pathname.startsWith('/bookings') || pathname.startsWith('/checkout')
    const isOrganiserRoute = pathname.startsWith('/organiser')
    const isAdminRoute = pathname.startsWith('/admin')
    const isProtectedRoute = isAccountRoute || isOrganiserRoute || isAdminRoute

    // If not authenticated and trying to access a protected route, redirect to login
    if (!user && isProtectedRoute) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('next', pathname)
        return redirectWithCookies(loginUrl, response)
    }

    // For authenticated users on protected or auth routes: fetch role once
    const needsRoleCheck =
        (user && isProtectedRoute) ||
        (user && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/callback'))

    if (needsRoleCheck && user) {
        // Use the service-role client so the role lookup bypasses RLS.
        // The anon-key client's JWT may not be forwarded to PostgREST in all
        // edge environments, making auth.uid() null and every RLS policy fail.
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

        // Authenticated user visiting an auth page → redirect to their dashboard
        if (pathname.startsWith('/auth/') && !pathname.startsWith('/auth/callback')) {
            const dest = request.nextUrl.clone()
            if (role === 'admin') {
                dest.pathname = '/admin'
            } else if (role === 'organiser') {
                const { data: orgProfile } = await serviceClient
                    .from('organiser_profiles')
                    .select('is_approved')
                    .eq('user_id', user.id)
                    .maybeSingle()
                dest.pathname = orgProfile?.is_approved ? '/organiser' : '/organiser/pending'
            } else {
                dest.pathname = '/account'
            }
            return redirectWithCookies(dest, response)
        }

        // Admin visiting /account/* → redirect to admin panel
        if (isAccountRoute && role === 'admin') {
            const dest = request.nextUrl.clone()
            dest.pathname = '/admin'
            return redirectWithCookies(dest, response)
        }

        // Organiser visiting /account/* → redirect to organiser portal
        if (isAccountRoute && role === 'organiser') {
            const dest = request.nextUrl.clone()
            dest.pathname = '/organiser'
            return redirectWithCookies(dest, response)
        }

        // /organiser/apply is accessible to any authenticated user
        // /organiser/pending is accessible to organisers (approved or not)
        if (isOrganiserRoute && !isOrganiserApplyRoute && !isOrganiserPendingRoute) {
            if (role !== 'organiser' && role !== 'admin') {
                const dest = request.nextUrl.clone()
                dest.pathname = '/'
                return redirectWithCookies(dest, response)
            }
        }

        // Admin routes: must have admin role
        if (isAdminRoute && role !== 'admin') {
            const dest = request.nextUrl.clone()
            dest.pathname = '/'
            return redirectWithCookies(dest, response)
        }
    }

    return response
}
